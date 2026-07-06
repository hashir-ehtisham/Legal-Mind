import { getServiceSupabaseClient } from '../lib/supabase';
import { ai } from '../lib/gemini';
import { SeedSource, ExtractedLawyer, CrawlStats } from './types';
import { PageFetcher } from './fetch';
import { PageDiscovery } from './discovery';
import { PageParser } from './parser';
import { RobotsTxt } from './robots';
import { CrawlLogger } from './logger';
import { sleep } from './retry';

// Initialize Supabase service role client
const supabase = getServiceSupabaseClient();

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Check if the lawyer already exists in the database.
 */
async function findExistingLawyer(lawyer: ExtractedLawyer): Promise<any> {
  // 1. Deduplicate by email
  if (lawyer.email) {
    const { data } = await supabase
      .from('lawyers')
      .select('id')
      .eq('email', lawyer.email)
      .maybeSingle();
    if (data) return data;
  }

  // 2. Deduplicate by phone/whatsapp
  const phoneVal = lawyer.whatsappNumber || lawyer.phone;
  if (phoneVal) {
    const { data } = await supabase
      .from('lawyers')
      .select('id')
      .eq('whatsapp_number', phoneVal)
      .maybeSingle();
    if (data) return data;
  }

  // 3. Deduplicate by normalized name + city
  if (lawyer.name && lawyer.city) {
    const { data: cityLawyers } = await supabase
      .from('lawyers')
      .select('id, name')
      .eq('city', lawyer.city);
    
    if (cityLawyers) {
      const normalizedTarget = normalizeName(lawyer.name);
      const matched = cityLawyers.find((cl: any) => normalizeName(cl.name) === normalizedTarget);
      if (matched) return matched;
    }
  }

  return null;
}

/**
 * Use Gemini to normalize specializations and estimate experience.
 */
async function processProfileWithGemini(lawyer: ExtractedLawyer): Promise<{ specialization: string[], experienceYears: number | null }> {
  if (!lawyer.bio) {
    return {
      specialization: lawyer.practiceAreas || ['General Practice'],
      experienceYears: lawyer.experienceYears || null
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this lawyer biography. Standardize their legal specializations/practice areas as an array of strings (e.g., "Criminal Law", "Corporate Law", "Family Law"). Estimate their experience in years as an integer.

Biography: "${lawyer.bio}"
Parsed Practice Areas: ${JSON.stringify(lawyer.practiceAreas || [])}
Parsed Experience Years: ${lawyer.experienceYears || 'unknown'}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            specialization: {
              type: 'array',
              items: { type: 'string' },
              description: 'Normalized specialization domains.'
            },
            estimated_experience_years: {
              type: 'integer',
              description: 'Estimated years. Return -1 if not found.'
            }
          },
          required: ['specialization', 'estimated_experience_years']
        }
      }
    });

    const text = response?.text;
    if (!text) throw new Error('No content returned from Gemini');

    const data = JSON.parse(text);
    const exp = typeof data.estimated_experience_years === 'number' && data.estimated_experience_years >= 0
      ? data.estimated_experience_years
      : lawyer.experienceYears || null;

    return {
      specialization: Array.isArray(data.specialization) ? data.specialization : (lawyer.practiceAreas || ['General Practice']),
      experienceYears: exp
    };
  } catch (error: any) {
    console.error(`[Gemini Error] Bio processing failed: ${error.message || error}`);
    return {
      specialization: lawyer.practiceAreas || ['General Practice'],
      experienceYears: lawyer.experienceYears || null
    };
  }
}

/**
 * Run the modular multi-source crawler.
 */
export async function startCrawler(sources: SeedSource[], maxPagesPerSource = 3) {
  console.log('--- Starting Production Lawyer Crawler ---');
  const fetcher = new PageFetcher();
  const discovery = new PageDiscovery(fetcher);

  try {
    for (const source of sources) {
      console.log(`\nStarting crawl for seed source: "${source.name}"`);
      const stats = CrawlLogger.createStats(source.name);

      // Parse domain
      let domain = '';
      try {
        domain = new URL(source.baseUrl).hostname;
      } catch {
        console.error(`Invalid base URL for source ${source.name}: ${source.baseUrl}`);
        continue;
      }

      // Respect Robots.txt
      const robots = await RobotsTxt.fetchForDomain(domain, 'LegalMindBot/2.0');
      const robotsDelay = robots.getCrawlDelay() * 1000 || 1000; // 1s default throttle

      // Discover profile links
      const profileLinks = await discovery.discoverProfileLinks(source, stats, maxPagesPerSource);
      stats.profilesFound = profileLinks.length;

      // Crawl profiles in parallel groups of 3 (Concurrency limit)
      const batchSize = 3;
      for (let i = 0; i < profileLinks.length; i += batchSize) {
        const batch = profileLinks.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (url) => {
            const urlPath = new URL(url).pathname;
            if (!robots.isAllowed(urlPath)) {
              console.log(`[Robots Skip] Disallowed path: ${urlPath}`);
              stats.profilesSkipped++;
              return;
            }

            try {
              // Wait for robots crawl delay
              await sleep(robotsDelay);

              // Fetch page
              const html = await fetcher.fetchUrl(url, source.baseUrl);
              if (!html || html.trim().length === 0) {
                throw new Error('Retrieved HTML is empty');
              }

              // Parse details
              const lawyer = PageParser.parseProfile(html, url, source);
              stats.profilesParsed++;

              // Skip if parser rejected the name (firm names, blog pages, nav labels, etc.)
              if (!lawyer.name || lawyer.name.trim().length < 4) {
                console.log(`[Skip] Rejected non-person record at ${url} (name: "${lawyer.name}")`);
                stats.profilesSkipped++;
                return;
              }

              // Use Gemini to normalize specializations & experience years
              const geminiRes = await processProfileWithGemini(lawyer);

              // Fallback to source city hint if parser resolved it as generic 'Pakistan'
              const finalCity = (lawyer.city === 'Pakistan' && source.cityHint) ? source.cityHint : lawyer.city;
              lawyer.city = finalCity;

              // Prepare DB record
              const dbRecord = {
                name: lawyer.name,
                city: finalCity,
                specialization: geminiRes.specialization,
                experience_years: geminiRes.experienceYears,
                email: lawyer.email || null,
                whatsapp_number: lawyer.whatsappNumber || lawyer.phone || null,
                bio: lawyer.bio || null,
                profile_image_url: lawyer.profileImageUrl || null,
                source_url: lawyer.sourceUrl,
                last_crawled_at: new Date().toISOString(),
                verified: false
              };

              // Deduplicate and save
              const existing = await findExistingLawyer(lawyer);
              if (existing) {
                const { error: updateErr } = await supabase
                  .from('lawyers')
                  .update(dbRecord)
                  .eq('id', existing.id);
                
                if (updateErr) {
                  throw new Error(`Failed to update lawyer: ${updateErr.message}`);
                }
                stats.profilesUpdated++;
                console.log(`[Update] Updated profile for "${lawyer.name}" (${lawyer.city})`);
              } else {
                const { error: insertErr } = await supabase
                  .from('lawyers')
                  .insert(dbRecord);
                
                if (insertErr) {
                  throw new Error(`Failed to insert lawyer: ${insertErr.message}`);
                }
                stats.profilesInserted++;
                console.log(`[Insert] Created profile for "${lawyer.name}" (${lawyer.city})`);
              }
            } catch (err: any) {
              console.error(`[Crawl Error] Failed to crawl profile ${url}:`, err?.message || err);
              stats.errors.push(`Profile ${url} error: ${err?.message || err}`);
            }
          })
        );
      }

      CrawlLogger.logProgress(stats);
    }
  } catch (globalErr: any) {
    console.error('Fatal error running crawler:', globalErr);
  } finally {
    await fetcher.closeBrowser();
  }

  console.log('--- Production Lawyer Crawler Finished ---');
}
