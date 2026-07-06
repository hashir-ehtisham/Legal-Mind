/**
 * purge-junk-records.ts
 * Deletes crawler-introduced junk records:
 * - Records where the name IS the firm name (not an individual advocate)
 * - Records where the name matches common non-person strings (Blog, Not Found, SearchLawyers, etc.)
 * - Records with URLs pointing to blog posts, notification pages, etc.
 */

import { getServiceSupabaseClient } from '../lib/supabase';

const supabase = getServiceSupabaseClient();

// IDs of confirmed junk records identified by inspect-db.ts
const JUNK_IDS = [
  'dcf0793f-76b6-47aa-abc6-b9af8fd483e1', // "Join For a Good Start..."
  'd4bbd23b-3362-47a7-b480-287452ce451a', // "Blog"
  '16cb44d0-f951-45ff-835d-8e8ade214e16', // "Vellani & Vellani" (bad city)
  'e3982857-7f0e-410d-acce-ec9a5560d858', // "Vellani & Vellani" Karachi duplicate
  'b7a1745d-ee37-453b-8a18-87d714dcc7c8', // "Vellani & Vellani" Karachi duplicate
  '38541730-934d-4b35-9322-5e512b6a8643', // "Vellani & Vellani" (bad city)
];

async function main() {
  console.log('--- Purging junk crawler records ---');

  // 1. Delete by known bad IDs
  const { data: byId, error: err1 } = await supabase
    .from('lawyers')
    .delete()
    .in('id', JUNK_IDS)
    .select('id, name');

  if (err1) console.error('Error deleting by ID:', err1.message);
  else console.log(`Deleted ${byId?.length ?? 0} junk records by ID`);

  // 2. Also clean up any remaining records where name contains known non-person strings
  const junkNamePatterns = [
    'vellani & vellani',
    'blog',
    'not found',
    'searchlawyers',
    'join for',
    'legal call',
    'usefull',
    'email support',
    'contact details',
  ];

  for (const pattern of junkNamePatterns) {
    const { data, error } = await supabase
      .from('lawyers')
      .delete()
      .ilike('name', `%${pattern}%`)
      .select('id, name');
    if (error) console.error(`Error cleaning pattern "${pattern}":`, error.message);
    else if (data && data.length > 0) {
      console.log(`Deleted ${data.length} records matching pattern "${pattern}":`);
      data.forEach(r => console.log(`  - ${r.name}`));
    }
  }

  // 3. Also clean kpbarcouncil "Not Found" and ihcba "SearchLawyers" by source
  const junkSources = [
    'www.kpbarcouncil.com',
    'www.ihcba.org.pk',
  ];
  for (const src of junkSources) {
    const { data, error } = await supabase
      .from('lawyers')
      .delete()
      .ilike('source_url', `%${src}%`)
      .select('id, name');
    if (error) console.error(`Error cleaning source "${src}":`, error.message);
    else if (data && data.length > 0) {
      console.log(`Deleted ${data.length} junk records from ${src}:`);
      data.forEach(r => console.log(`  - ${r.name}`));
    }
  }

  console.log('--- Junk purge complete ---');

  // Show remaining count
  const { count } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true });
  console.log(`\nDatabase now has ${count} lawyer records.`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
