import { retryWithBackoff } from './retry';

export class RobotsTxt {
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

  isAllowed(urlPath: string): boolean {
    for (const disallowed of this.disallowedPaths) {
      if (disallowed === '/') return false;
      const cleanDisallowed = disallowed.replace(/\*/g, '.*').replace(/\?/g, '\\?');
      const regex = new RegExp('^' + cleanDisallowed);
      if (regex.test(urlPath)) {
        return false;
      }
    }
    return true;
  }

  getCrawlDelay(): number {
    return this.crawlDelay;
  }

  static async fetchForDomain(domain: string, userAgent: string): Promise<RobotsTxt> {
    const robotsUrl = `https://${domain}/robots.txt`;
    try {
      const res = await retryWithBackoff(async () => {
        const response = await fetch(robotsUrl, {
          headers: { 'User-Agent': userAgent }
        });
        if (!response.ok && response.status !== 404) {
          throw { status: response.status, message: `HTTP status ${response.status}` };
        }
        return response;
      });

      if (res.ok) {
        const text = await res.text();
        return new RobotsTxt(text, userAgent);
      }
    } catch (err) {
      console.warn(`[Warning] Could not fetch robots.txt for ${domain}. Assuming all paths allowed.`);
    }
    return new RobotsTxt('', userAgent);
  }
}
