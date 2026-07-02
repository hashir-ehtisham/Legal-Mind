import { CrawlStats } from './types';

export class CrawlLogger {
  static createStats(site: string): CrawlStats {
    return {
      site,
      pagesCrawled: 0,
      profilesFound: 0,
      profilesParsed: 0,
      profilesSkipped: 0,
      profilesUpdated: 0,
      profilesInserted: 0,
      errors: [],
      startTime: new Date()
    };
  }

  static logProgress(stats: CrawlStats) {
    const elapsedMs = Date.now() - stats.startTime.getTime();
    const elapsedSec = (elapsedMs / 1000).toFixed(1);
    console.log(`
========================================
CRAWL PROGRESS & STATISTICS: ${stats.site}
========================================
- Pages crawled      : ${stats.pagesCrawled}
- Profiles found     : ${stats.profilesFound}
- Profiles parsed    : ${stats.profilesParsed}
- Profiles skipped   : ${stats.profilesSkipped}
- Profiles updated   : ${stats.profilesUpdated}
- Profiles inserted  : ${stats.profilesInserted}
- Errors encountered : ${stats.errors.length}
- Elapsed time       : ${elapsedSec} seconds
========================================
`);
    if (stats.errors.length > 0) {
      console.log('Errors List (Last 5):');
      stats.errors.slice(-5).forEach((e, idx) => console.log(`  [${idx + 1}] ${e}`));
      console.log('========================================');
    }
  }
}
