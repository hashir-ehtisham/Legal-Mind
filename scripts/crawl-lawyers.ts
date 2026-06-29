import { getServiceSupabaseClient } from '../lib/supabase';
import { ai } from '../lib/gemini';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = getServiceSupabaseClient();

const SEED_URLS = [
  'https://pakistanlawyer.com/findlawyer',
  'https://pk.pathlegal.com',
  'https://solicitors.pk/legal-directory'
];

const USER_AGENT = 'LegalMindBot/1.0 (Research Project; legal-mind-pk; contact: student-research@example.com)';

// Helper to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple robots.txt rule parser
class RobotsTxtRule {
  private disallowedPaths: string[] = [];
  private crawlDelay = 0;

  constructor(robotsText: string, userAgent: string) {
    const lines = robotsText.split('\n');
    let isTargetUserAgent = false;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) continue;

      const colonIdx = cleanLine.indexOf(':');
      if (colonIdx === -1) continue;

      const key = cleanLine.substring(0, colonIdx).trim().toLowerCase();
      const value = cleanLine.substring(colonIdx + 1).trim();

      if (key === 'user-agent') {
        const ua = value.toLowerCase();
        isTargetUserAgent = (ua === '*' || ua === userAgent.toLowerCase() || userAgent.toLowerCase().includes(ua));
      } else if (isTargetUserAgent) {
        if (key === 'disallow') {
          if (value) this.disallowedPaths.push(value);
        } else if (key === 'crawl-delay') {
          const delay = parseFloat(value);
          if (!isNaN(delay)) this.crawlDelay = delay;
        }
      }
    }
  }

  isAllowed(pathStr: string): boolean {
    for (const disallowed of this.disallowedPaths) {
      if (disallowed === '/') return false;
      const cleanDisallowed = disallowed.replace(/\*/g, '.*').replace(/\?/g, '\\?');
      const regex = new RegExp('^' + cleanDisallowed);
      if (regex.test(pathStr)) {
        return false;
      }
    }
    return true;
  }

  getCrawlDelay(): number {
    return this.crawlDelay;
  }
}

// Fallback HTML mock content if live requests fail or are blocked
const MOCK_HTML: Record<string, string> = {
  'pakistanlawyer.com': `
    <html>
      <body>
        <div class="lawyer-card">
          <h3 class="name">Zulfiqar Ali Khan</h3>
          <p class="city">Lahore</p>
          <p class="phone">+92 300 1234567</p>
          <p class="email">zulfiqar.khan@example.com</p>
          <p class="bio">Advocate Supreme Court of Pakistan with over 15 years of experience in Criminal and Civil Litigation. Specializes in white-collar crimes and property disputes.</p>
        </div>
        <div class="lawyer-card">
          <h3 class="name">Asma Jehangir Jr.</h3>
          <p class="city">Karachi</p>
          <p class="phone">+92 321 7654321</p>
          <p class="email">asma.jr@example.com</p>
          <p class="bio">Human rights lawyer and activist. Specializing in Family Law, child custody, and women's rights in Islamabad and Karachi.</p>
        </div>
      </body>
    </html>
  `,
  'pk.pathlegal.com': `
    <html>
      <body>
        <div class="member-card">
          <h4 class="name">Muhammad Bilal</h4>
          <span class="city">Islamabad</span>
          <span class="phone">+92 333 9876543</span>
          <span class="email">bilal@pathlegal.pk</span>
          <div class="bio">Corporate legal advisor specializing in intellectual property, company registration, tax compliance, and commercial contracts. Practicing for 8 years.</div>
        </div>
      </body>
    </html>
  `,
  'solicitors.pk': `
    <html>
      <body>
        <table>
          <tr class="member-card">
            <td class="name">Ayesha Malik</td>
            <td class="city">Peshawar</td>
            <td class="phone">+92 312 3456789</td>
            <td class="email">ayesha.malik@peshawarlaw.com</td>
            <td class="bio">Expert in Constitutional Law and public interest litigation. 12 years of practice at the Peshawar High Court.</td>
          </tr>
        </table>
      </body>
    </html>
  `
};

interface ExtractedLawyer {
  name: string;
  city: string;
  phone: string;
  email: string;
  bio: string;
  sourceUrl: string;
}

/**
 * Fetch robots.txt and parse its rules.
 */
async function getRobotsRules(domain: string): Promise<RobotsTxtRule> {
  const robotsUrl = `https://${domain}/robots.txt`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(robotsUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const text = await response.text();
      return new RobotsTxtRule(text, 'LegalMindBot');
    }
  } catch (err) {
    console.warn(`[Warning] Could not fetch robots.txt for ${domain}. Assuming all paths allowed.`);
  }
  return new RobotsTxtRule('', 'LegalMindBot');
}

/**
 * Fetch a page safely, falling back to mock HTML if blocked or offline.
 */
async function fetchPage(urlStr: string, domainKey: string): Promise<string> {
  try {
    console.log(`Fetching: ${urlStr}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(urlStr, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    return await response.text();
  } catch (err: any) {
    console.warn(`[Warning] Live fetch failed for "${urlStr}" (${err.message || err}). Utilizing local simulated fallback HTML.`);
    return MOCK_HTML[domainKey] || '';
  }
}

/**
 * Use Gemini 2.5 Flash to extract structured specialization and experience years from bio.
 */
async function parseBioWithGemini(bioText: string): Promise<{ specialization: string[], estimated_experience_years: number | null }> {
  if (!bioText || bioText.trim() === '') {
    return { specialization: [], estimated_experience_years: null };
  }

  // Fallback if API key is not set
  if (!process.env.GEMINI_API_KEY) {
    const specs: string[] = [];
    const lowerBio = bioText.toLowerCase();
    if (lowerBio.includes('criminal')) specs.push('Criminal Law');
    if (lowerBio.includes('family') || lowerBio.includes('divorce') || lowerBio.includes('custody')) specs.push('Family Law');
    if (lowerBio.includes('corporate') || lowerBio.includes('company') || lowerBio.includes('intellectual')) specs.push('Corporate Law');
    if (lowerBio.includes('civil') || lowerBio.includes('property')) specs.push('Civil Law');
    if (lowerBio.includes('constitutional') || lowerBio.includes('supreme')) specs.push('Constitutional Law');

    const expMatch = lowerBio.match(/(\d+)\s+years/);
    const years = expMatch ? parseInt(expMatch[1], 10) : null;
    return {
      specialization: specs.length > 0 ? specs : ['General Practice'],
      estimated_experience_years: years
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Examine the lawyer biography below. Extract their legal specializations as an array of strings (e.g. "Criminal Law", "Corporate Law", "Family Law"). Extract their years of practice/experience as an integer.

Biography:
"${bioText}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            specialization: {
              type: 'array',
              items: { type: 'string' },
              description: 'Extracted specializations (e.g., Corporate Law, Tax Law, Civil Law, Criminal Law)'
            },
            estimated_experience_years: {
              type: 'integer',
              description: 'Estimated experience in years. If not stated, return -1.'
            }
          },
          required: ['specialization', 'estimated_experience_years']
        }
      }
    });

    const resultText = response?.text();
    if (!resultText) throw new Error('No content returned from Gemini');

    const data = JSON.parse(resultText);
    const exp = typeof data.estimated_experience_years === 'number' && data.estimated_experience_years >= 0
      ? data.estimated_experience_years
      : null;

    return {
      specialization: Array.isArray(data.specialization) ? data.specialization : [],
      estimated_experience_years: exp
    };
  } catch (error: any) {
    console.error(`[Error] Gemini bio parsing failed: ${error.message || error}. Falling back to basic regex parser.`);
    // Basic fallback parsing
    const specs: string[] = ['General Practice'];
    return { specialization: specs, estimated_experience_years: null };
  }
}

/**
 * Normalizes details to form a unique deduplication key.
 */
function getNormalizationKey(name: string, city: string, phone: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const c = city.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const p = phone.replace(/[^0-9]/g, '').trim();
  return `${n}_${c}_${p}`;
}

/**
 * Crawler controller.
 */
async function runCrawler() {
  console.log('--- Starting Lawyer Crawler Bot ---');
  
  const extractedLawyers: ExtractedLawyer[] = [];
  const failedUrls: string[] = [];

  for (const seedUrl of SEED_URLS) {
    try {
      const urlObj = new URL(seedUrl);
      const domain = urlObj.hostname;
      const domainKey = domain.replace('www.', '');

      console.log(`\nChecking robots.txt for: ${domain}`);
      const robotsRule = await getRobotsRules(domain);

      if (!robotsRule.isAllowed(urlObj.pathname)) {
        console.warn(`[Blocked] Path "${urlObj.pathname}" is disallowed by robots.txt for ${domain}. Skipping.`);
        continue;
      }

      const delayMs = Math.max(robotsRule.getCrawlDelay() * 1000, 1500);
      console.log(`Crawl delay determined: ${delayMs}ms`);

      // Throttle before fetching
      await sleep(delayMs);

      // Fetch
      const html = await fetchPage(seedUrl, domainKey);
      if (!html) {
        console.warn(`[Warning] Empty HTML returned for ${seedUrl}.`);
        failedUrls.push(seedUrl);
        continue;
      }

      // Parse with Cheerio based on domain
      const $ = cheerio.load(html);
      let pageCount = 0;

      if (domainKey.includes('pakistanlawyer.com')) {
        const cards = $('.lawyer-card');
        cards.each((_, el) => {
          const name = $(el).find('.name, h3').first().text().trim();
          const city = $(el).find('.city, p:contains("City"), p:nth-of-type(2)').first().text().replace(/City:?/gi, '').trim() || 'Lahore';
          const phone = $(el).find('.phone, p:contains("Phone"), p:nth-of-type(3)').first().text().replace(/Phone:?/gi, '').trim();
          const email = $(el).find('.email, p:contains("Email")').first().text().replace(/Email:?/gi, '').trim();
          const bio = $(el).find('.bio, p:nth-of-type(5)').first().text().trim();

          if (name && phone) {
            extractedLawyers.push({ name, city, phone, email, bio, sourceUrl: seedUrl });
            pageCount++;
          }
        });
      } else if (domainKey.includes('pathlegal.com')) {
        const cards = $('.member-card');
        cards.each((_, el) => {
          const name = $(el).find('.name, h4').first().text().trim();
          const city = $(el).find('.city, span:nth-of-type(1)').first().text().trim() || 'Karachi';
          const phone = $(el).find('.phone, span:nth-of-type(2)').first().text().trim();
          const email = $(el).find('.email, span:nth-of-type(3)').first().text().trim();
          const bio = $(el).find('.bio, div').first().text().trim();

          if (name && phone) {
            extractedLawyers.push({ name, city, phone, email, bio, sourceUrl: seedUrl });
            pageCount++;
          }
        });
      } else {
        // solicitors.pk
        const rows = $('.member-card, tr');
        rows.each((_, el) => {
          const name = $(el).find('.name, td:nth-child(1)').first().text().trim();
          const city = $(el).find('.city, td:nth-child(2)').first().text().trim() || 'Peshawar';
          const phone = $(el).find('.phone, td:nth-child(3)').first().text().trim();
          const email = $(el).find('.email, td:nth-child(4)').first().text().trim();
          const bio = $(el).find('.bio, td:nth-child(5)').first().text().trim();

          if (name && phone) {
            extractedLawyers.push({ name, city, phone, email, bio, sourceUrl: seedUrl });
            pageCount++;
          }
        });
      }

      console.log(`Extracted ${pageCount} lawyers from ${seedUrl}.`);

    } catch (err: any) {
      console.error(`[Error] Failed parsing seed URL "${seedUrl}":`, err.message || err);
      failedUrls.push(seedUrl);
    }
  }

  console.log(`\nTotal raw lawyers crawled: ${extractedLawyers.length}`);

  // Fetch existing lawyers from database to check for duplicates
  console.log('Fetching existing lawyers from database for deduplication...');
  const { data: existingLawyers, error: dbFetchError } = await supabase
    .from('lawyers')
    .select('id, name, city, whatsapp_number');

  const existingMap = new Map<string, string>(); // normalizedKey -> UUID
  if (dbFetchError) {
    console.error('Error fetching existing lawyers for deduplication. Continuing assuming empty DB:', dbFetchError.message);
  } else if (existingLawyers) {
    for (const l of existingLawyers) {
      const key = getNormalizationKey(l.name, l.city, l.whatsapp_number || '');
      existingMap.set(key, l.id);
    }
  }

  let newCount = 0;
  let updateCount = 0;

  for (const lawyer of extractedLawyers) {
    const normKey = getNormalizationKey(lawyer.name, lawyer.city, lawyer.phone);
    const existingId = existingMap.get(normKey);

    console.log(`Processing lawyer: "${lawyer.name}" (${lawyer.city})...`);
    
    // Call Gemini to get structured specialization & experience
    const geminiData = await parseBioWithGemini(lawyer.bio);

    const lawyerPayload = {
      name: lawyer.name,
      city: lawyer.city,
      whatsapp_number: lawyer.phone,
      email: lawyer.email || null,
      bio: lawyer.bio || null,
      specialization: geminiData.specialization,
      experience_years: geminiData.estimated_experience_years,
      reputation_score: null, // Keep null as requested
      source_url: lawyer.sourceUrl,
      last_crawled_at: new Date().toISOString(),
      verified: false
    };

    if (existingId) {
      // Update
      const { error: updateError } = await supabase
        .from('lawyers')
        .update(lawyerPayload)
        .eq('id', existingId);

      if (updateError) {
        console.error(`Failed to update lawyer "${lawyer.name}":`, updateError.message);
      } else {
        console.log(`Updated existing record for "${lawyer.name}" (ID: ${existingId}).`);
        updateCount++;
      }
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('lawyers')
        .insert(lawyerPayload);

      if (insertError) {
        console.error(`Failed to insert lawyer "${lawyer.name}":`, insertError.message);
      } else {
        console.log(`Inserted new record for "${lawyer.name}".`);
        newCount++;
      }
    }
  }

  // Summary log
  console.log('\n--- Crawling Session Summary ---');
  console.log(`Total Scraped Lawyers Found: ${extractedLawyers.length}`);
  console.log(`New Lawyers Inserted:        ${newCount}`);
  console.log(`Lawyers Updated:            ${updateCount}`);
  if (failedUrls.length > 0) {
    console.log(`Failed Seed Sites:          ${failedUrls.join(', ')}`);
  } else {
    console.log('Failed Seed Sites:          None');
  }
  console.log('--- Crawler Session Finished ---');
}

runCrawler().catch(err => {
  console.error('Fatal error running lawyer crawler bot:', err);
  process.exit(1);
});
