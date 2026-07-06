import * as cheerio from 'cheerio';
import { SeedSource, CrawlStats } from './types';
import { PageFetcher } from './fetch';
import { PageParser } from './parser';

export class PageDiscovery {
  private fetcher: PageFetcher;

  constructor(fetcher: PageFetcher) {
    this.fetcher = fetcher;
  }

  /**
   * Crawl all pages of a seed source directory to discover profile links.
   */
  async discoverProfileLinks(
    source: SeedSource,
    stats: CrawlStats,
    maxPages = 5
  ): Promise<string[]> {
    const discoveredLinks = new Set<string>();
    let currentUrl: string | null = source.directoryUrl;
    let pageNum = 1;

    while (pageNum <= maxPages && currentUrl) {
      console.log(`[Discovery] Crawling page ${pageNum} for "${source.name}": ${currentUrl}`);
      try {
        stats.pagesCrawled++;
        const html = await this.fetcher.fetchUrl(currentUrl);
        const links = PageParser.parseListingLinks(html, source);

        links.forEach(l => discoveredLinks.add(l));
        console.log(`[Discovery] Found ${links.length} profiles on page ${pageNum}. (Total: ${discoveredLinks.size})`);

        // Find next page link
        currentUrl = this.findNextPageUrl(html, currentUrl, pageNum, source);
        pageNum++;
      } catch (err: any) {
        console.error(`[Discovery Error] Failed to process directory page ${pageNum} (${currentUrl}):`, err?.message || err);
        stats.errors.push(`Directory page ${pageNum} fetch error: ${err?.message || err}`);
        break; // skip source if main list fails
      }
    }

    return Array.from(discoveredLinks);
  }

  /**
   * Determine next page URL.
   */
  private findNextPageUrl(
    html: string,
    currentUrl: string,
    currentPage: number,
    source: SeedSource
  ): string | null {
    const $ = cheerio.load(html);

    // 1. Try configuration pagination selector
    if (source.paginationSelector) {
      const links = $(source.paginationSelector);
      let nextUrl: string | null = null;
      links.each((_, el) => {
        const text = $(el).text().toLowerCase().trim();
        const href = $(el).attr('href');
        if (href && (text.includes('next') || text.includes('>') || text === String(currentPage + 1))) {
          try {
            nextUrl = new URL(href, source.baseUrl).toString();
          } catch {
            // ignore
          }
        }
      });
      if (nextUrl) return nextUrl;
    }

    // 2. Try generic next links
    const genericNextSelectors = [
      'a[rel="next"]',
      'a:contains("Next")',
      'a:contains("next")',
      'a:contains(">")',
      'li.next a',
      'li.page-item.active + li.page-item a'
    ];

    for (const sel of genericNextSelectors) {
      const href = $(sel).first().attr('href');
      if (href) {
        try {
          return new URL(href, source.baseUrl).toString();
        } catch {
          // ignore
        }
      }
    }

    // 3. Fallback: try constructing page parameter if URL matches standard structures
    try {
      const urlObj = new URL(currentUrl);
      if (urlObj.searchParams.has('page')) {
        urlObj.searchParams.set('page', String(currentPage + 1));
        return urlObj.toString();
      } else if (urlObj.searchParams.has('p')) {
        urlObj.searchParams.set('p', String(currentPage + 1));
        return urlObj.toString();
      }
    } catch {
      // ignore
    }

    return null;
  }
}
