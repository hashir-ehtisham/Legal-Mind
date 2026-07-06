import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { getServiceSupabaseClient } from '../lib/supabase';
import { getEmbedding } from '../lib/gemini';

// Initialize Supabase service role client (bypasses RLS)
const supabase = getServiceSupabaseClient();

// Configure search directory
const DOCS_DIR = path.join(process.cwd(), 'data', 'legal-docs');

// Free-tier limit: 100 embed requests/minute → increased to 1 request per 1000 ms for safety
const THROTTLE_MS = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrapper around getEmbedding that retries with exponential backoff on 429 and 503 errors.
 */
async function getEmbeddingWithRetry(text: string, maxRetries = 5, initialDelay = 1000): Promise<number[]> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await getEmbedding(text);
    } catch (error: any) {
      const status = error?.status || (error?.message?.includes('429') ? 429 : error?.message?.includes('503') ? 503 : null);
      if ((status === 429 || status === 503) && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[Retry] API returned ${status}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded for getEmbedding');
}

/**
 * Text cleaner to remove headers, footers, page numbers and excessive whitespace.
 */
function cleanText(text: string): string {
  // 1. Remove obvious page numbers and footers
  let cleaned = text.replace(/\n\s*Page\s+\d+\s+of\s+\d+\s*\n/gi, '\n');
  cleaned = cleaned.replace(/\n\s*\d+\s*of\s*\d+\s*\n/gi, '\n');
  cleaned = cleaned.replace(/\n\s*-\s*\d+\s*-\s*\n/g, '\n'); // - 1 -
  cleaned = cleaned.replace(/\b(Page|page)\s+\d+\b/g, '');

  // 2. Collapse horizontal spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');

  // 3. Clean leading/trailing spaces per line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // 4. Collapse multiple empty lines to double newlines
  cleaned = cleaned.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return cleaned.trim();
}

/**
 * Splitting text into ~500 token chunks (~2000 characters) with ~50 token overlap (~200 characters),
 * ensuring we respect paragraph and sentence boundaries.
 */
function splitIntoChunks(text: string, targetTokenSize = 500, overlapTokenSize = 50): string[] {
  const targetCharSize = targetTokenSize * 4;
  const overlapCharSize = overlapTokenSize * 4;

  const rawParagraphs = text.split(/\n\s*\n+/);
  const paragraphs: string[] = [];

  // Break oversized paragraphs down to sentence groups so chunking doesn't exceed bounds
  for (const rawPara of rawParagraphs) {
    if (rawPara.length <= targetCharSize) {
      paragraphs.push(rawPara);
    } else {
      // Split by sentence (match punctuation followed by space or newline)
      const sentences = rawPara.match(/[^.!?]+[.!?]+(\s|$)/g) || [rawPara];
      let temp = '';
      for (const sent of sentences) {
        if ((temp.length + sent.length) <= targetCharSize) {
          temp += sent;
        } else {
          if (temp) paragraphs.push(temp.trim());
          temp = sent;
        }
      }
      if (temp) paragraphs.push(temp.trim());
    }
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();
    if (!para) continue;

    if (!currentChunk) {
      currentChunk = para;
    } else if ((currentChunk.length + para.length) <= targetCharSize) {
      currentChunk += '\n\n' + para;
    } else {
      chunks.push(currentChunk);
      
      // Calculate overlap: grab previous paragraphs that fit within overlap limit
      let overlapText = '';
      let j = i - 1;
      while (j >= 0 && (overlapText.length + paragraphs[j].length) <= overlapCharSize) {
        overlapText = paragraphs[j].trim() + (overlapText ? '\n\n' + overlapText : '');
        j--;
      }
      currentChunk = (overlapText ? overlapText + '\n\n' : '') + para;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Extracts raw text based on file format.
 */
async function parseFile(filePath: string, ext: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  switch (ext) {
    case '.pdf': {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    }
    case '.docx': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case '.html':
    case '.htm': {
      const htmlContent = buffer.toString('utf-8');
      const $ = cheerio.load(htmlContent);
      // Remove style, script, navigation, footer and other headers
      $('script, style, head, nav, footer, header').remove();
      return $('body').text() || $.text();
    }
    case '.txt': {
      return buffer.toString('utf-8');
    }
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}

/**
 * Runs the ingestion pipeline.
 */
async function runIngestion() {
  console.log('--- Starting Legal Mind Ingestion Pipeline ---');
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.log(`Creating documents directory at ${DOCS_DIR}...`);
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(DOCS_DIR);
  const supportedExtensions = ['.pdf', '.docx', '.html', '.htm', '.txt'];
  const allTargets = files.filter(f => supportedExtensions.includes(path.extname(f).toLowerCase()));

  // Start from muslim-law-ordinance.pdf onwards
  const startIndex = allTargets.findIndex(f => f.toLowerCase() === 'muslim-law-ordinance.pdf');
  const targets = startIndex !== -1 ? allTargets.slice(startIndex) : allTargets;

  if (targets.length === 0) {
    console.log(`No documents found in ${DOCS_DIR}. Please add PDF, DOCX, HTML, or TXT files.`);
    return;
  }

  console.log(`Found ${allTargets.length} files total. Slicing to ingest ${targets.length} files starting from ${targets[0]}.`);

  for (const filename of targets) {
    const filePath = path.join(DOCS_DIR, filename);
    const ext = path.extname(filename).toLowerCase();
    const docTitle = path.basename(filename, ext).replace(/[-_]/g, ' ');

    console.log(`\nProcessing file: "${filename}"...`);

    try {
      // 1. Parse text
      const rawText = await parseFile(filePath, ext);
      if (!rawText.trim()) {
        console.warn(`Warning: Extracted text from "${filename}" is empty.`);
        continue;
      }

      // 2. Clean text
      const cleanedText = cleanText(rawText);

      // 3. Chunk text
      const chunks = splitIntoChunks(cleanedText);
      console.log(`Split "${filename}" into ${chunks.length} chunks.`);

      // 4a. Idempotency check: check if document already exists
      const sourceUrl = `file://${filePath.replace(/\\/g, '/')}`;
      const { data: existingDoc } = await supabase
        .from('legal_documents')
        .select('id')
        .eq('source_url', sourceUrl)
        .maybeSingle();

      let documentId: string;
      const existingChunkIndices = new Set<number>();

      if (existingDoc) {
        documentId = existingDoc.id;
        // Fetch existing chunk indices
        const { data: existingChunks, error: fetchErr } = await supabase
          .from('legal_chunks')
          .select('metadata')
          .eq('document_id', documentId);

        if (fetchErr) {
          console.error(`Error fetching existing chunks: ${fetchErr.message}`);
        } else if (existingChunks) {
          existingChunks.forEach(c => {
            const index = (c.metadata as any)?.chunk_index;
            if (typeof index === 'number') {
              existingChunkIndices.add(index);
            }
          });
        }

        if (existingChunkIndices.size >= chunks.length) {
          console.log(`[Skip] "${filename}" already fully ingested (${existingChunkIndices.size} chunks). Skipping.`);
          continue;
        }

        console.log(
          `[Resume] "${filename}" partially ingested (${existingChunkIndices.size}/${chunks.length} chunks). Resuming and skipping existing chunks.`
        );
      } else {
        // 4b. Insert Document into Database
        // Categorize basic laws based on name keywords
        let category = 'General Legislation';
        const lowercaseTitle = docTitle.toLowerCase();
        if (lowercaseTitle.includes('const') || lowercaseTitle.includes('constitution')) {
          category = 'Constitutional Law';
        } else if (lowercaseTitle.includes('penal') || lowercaseTitle.includes('criminal')) {
          category = 'Criminal Law';
        } else if (lowercaseTitle.includes('civil') || lowercaseTitle.includes('procedure')) {
          category = 'Civil Law';
        } else if (lowercaseTitle.includes('tax') || lowercaseTitle.includes('revenue') || lowercaseTitle.includes('finance')) {
          category = 'Taxation Law';
        } else if (lowercaseTitle.includes('family') || lowercaseTitle.includes('marriage') || lowercaseTitle.includes('divorce')) {
          category = 'Family Law';
        }

        const { data: docData, error: docError } = await supabase
          .from('legal_documents')
          .insert({
            title: docTitle,
            law_category: category,
            source_url: sourceUrl,
          })
          .select()
          .single();

        if (docError) {
          throw new Error(`Failed to insert document: ${docError.message}`);
        }

        documentId = docData.id;
        console.log(`Inserted document "${docTitle}" under ID: ${documentId}`);
      }

      // 5. Embed and insert chunks
      let chunkSuccessCount = existingChunkIndices.size;
      for (let i = 0; i < chunks.length; i++) {
        if (existingChunkIndices.has(i)) {
          continue;
        }
        const chunkContent = chunks[i];
        
        try {
          // Generate embedding using gemini-embedding-001 (via getEmbeddingWithRetry)
          // Throttle: wait before each request to stay under the free-tier cap
          await sleep(THROTTLE_MS);
          const embedding = await getEmbeddingWithRetry(chunkContent);

          const { error: chunkError } = await supabase
            .from('legal_chunks')
            .insert({
              document_id: documentId,
              content: chunkContent,
              embedding: embedding,
              metadata: {
                chunk_index: i,
                filename: filename,
                title: docTitle
              }
            });

          if (chunkError) {
            console.error(`Error inserting chunk ${i} for "${filename}":`, chunkError.message);
          } else {
            chunkSuccessCount++;
          }
        } catch (embeddingErr: any) {
          console.error(`Error embedding/uploading chunk ${i} for "${filename}":`, embeddingErr.message || embeddingErr);
        }
      }

      console.log(`Successfully ingested ${chunkSuccessCount}/${chunks.length} chunks for "${filename}".`);

    } catch (err: any) {
      console.error(`[Error] Gracefully skipped processing for file "${filename}":`, err.message || err);
    }
  }

  console.log('\n--- Ingestion Pipeline Finished ---');
}

runIngestion().catch(err => {
  console.error('Fatal error running ingestion pipeline:', err);
  process.exit(1);
});
