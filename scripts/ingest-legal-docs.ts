import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { getServiceSupabaseClient } from '../lib/supabase';
import { getEmbedding } from '../lib/gemini';

// Initialize Supabase service role client (bypasses RLS)
const supabase = getServiceSupabaseClient();

// Configure search directory
const DOCS_DIR = path.join(process.cwd(), 'data', 'legal-docs');

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
      const data = await pdf(buffer);
      return data.text;
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
  const targets = files.filter(f => supportedExtensions.includes(path.extname(f).toLowerCase()));

  if (targets.length === 0) {
    console.log(`No documents found in ${DOCS_DIR}. Please add PDF, DOCX, HTML, or TXT files.`);
    return;
  }

  console.log(`Found ${targets.length} files to ingest.`);

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

      // 4. Insert Document into Database
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
          source_url: `file://${filePath.replace(/\\/g, '/')}`
        })
        .select()
        .single();

      if (docError) {
        throw new Error(`Failed to insert document: ${docError.message}`);
      }

      const documentId = docData.id;
      console.log(`Inserted document "${docTitle}" under ID: ${documentId}`);

      // 5. Embed and insert chunks
      let chunkSuccessCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
          // Generate embedding using text-embedding-004
          const embedding = await getEmbedding(chunkContent);

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
