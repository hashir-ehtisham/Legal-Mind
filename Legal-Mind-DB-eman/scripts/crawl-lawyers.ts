import { startCrawler } from '../crawler/crawler';
import { SEED_SOURCES } from '../crawler/selectors';

async function main() {
  console.log('Starting legal-mind lawyer crawler runner...');
  // Run the crawler with our defined Seed Sources, limiting pages per source to 3
  await startCrawler(SEED_SOURCES, 3);
}

main().catch(err => {
  console.error('Fatal error running crawler runner script:', err);
  process.exit(1);
});
