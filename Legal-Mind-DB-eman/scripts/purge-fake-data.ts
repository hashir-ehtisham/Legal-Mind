/**
 * purge-fake-data.ts
 * One-shot script to delete all synthetically seeded (fake) lawyer records
 * that were inserted by seed-lawyers.ts. These are identified by:
 *   - source_url containing 'mock-directory.pk'
 */

import { getServiceSupabaseClient } from '../lib/supabase';

const supabase = getServiceSupabaseClient();

async function main() {
  console.log('--- Purging fake/seeded lawyer records ---');

  // Delete any row whose source_url points to the mock directory
  const { data, error } = await supabase
    .from('lawyers')
    .delete()
    .ilike('source_url', '%mock-directory.pk%')
    .select('id, name');

  if (error) {
    console.error('Error deleting fake records:', error.message);
    process.exit(1);
  }

  console.log(`Deleted ${data?.length ?? 0} fake records:`);
  data?.forEach(r => console.log(`  - [${r.id}] ${r.name}`));
  console.log('--- Done. Database now contains only real crawled data. ---');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
