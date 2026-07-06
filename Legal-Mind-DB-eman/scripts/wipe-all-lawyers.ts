/**
 * wipe-all-lawyers.ts
 * Deletes EVERY record from the lawyers table.
 * Database must start empty - lawyers are discovered on-demand via live search only.
 */

import { getServiceSupabaseClient } from '../lib/supabase';

const supabase = getServiceSupabaseClient();

async function main() {
  console.log('--- Wiping ALL lawyers from database ---');

  // Count before
  const { count: before } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true });

  console.log(`Records before: ${before}`);

  // Delete everything — no filter = delete all rows
  const { error } = await supabase
    .from('lawyers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // neq on impossible value = matches all rows

  if (error) {
    console.error('Error wiping table:', error.message);
    process.exit(1);
  }

  // Count after
  const { count: after } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true });

  console.log(`Records after: ${after}`);
  console.log('--- Database is now completely empty. Lawyers will be discovered on-demand. ---');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
