import { chromium, Browser } from 'playwright';
import { retryWithBackoff } from './retry';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export class PageFetcher {
  private browser: Browser | null = null;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async fetchUrl(url: string, referer?: string): Promise<string> {
    const ua = getRandomUserAgent();
    
    // Attempt standard fetch first (using retryWithBackoff)
    try {
      const html = await retryWithBackoff(async () => {
        const headers: Record<string, string> = {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
        };
        if (referer) {
          headers['Referer'] = referer;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw { status: response.status, message: `HTTP status ${response.status}` };
        }

        const text = await response.text();
        if (!text || text.trim().length === 0 || (text.toLowerCase().includes('javascript') && text.length < 500)) {
          throw new Error('Possibly empty or JS-only page');
        }
        return text;
      });

      return html;
    } catch (err: any) {
      console.warn(`[Fetch Helper] Standard fetch failed/returned empty for "${url}": ${err?.message || err}. Falling back to Playwright...`);
      return await this.fetchWithPlaywright(url, ua, referer);
    }
  }

  private async fetchWithPlaywright(url: string, userAgent: string, referer?: string): Promise<string> {
    await this.initBrowser();
    if (!this.browser) throw new Error('Failed to initialize Playwright browser');

    return await retryWithBackoff(async () => {
      const context = await this.browser!.newContext({
        userAgent,
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          ...(referer ? { 'Referer': referer } : {})
        }
      });
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const content = await page.content();
        await context.close();
        return content;
      } catch (pwErr) {
        await context.close();
        throw pwErr;
      }
    });
  }
}
