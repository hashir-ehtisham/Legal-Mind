/**
 * inspect-db.ts
 * Shows all lawyers currently in the database grouped by source,
 * so we can verify what is real and what is junk.
 */

import { getServiceSupabaseClient } from '../lib/supabase';

const supabase = getServiceSupabaseClient();

async function main() {
  const { data, error } = await supabase
    .from('lawyers')
    .select('id, name, city, source_url, verified, bio, email, specialization')
    .order('source_url', { ascending: true });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  // Group by source domain
  const grouped: Record<string, any[]> = {};
  for (const row of data ?? []) {
    const url = row.source_url ?? 'unknown';
    let domain = 'unknown';
    try { domain = new URL(url).hostname; } catch { domain = url; }
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(row);
  }

  console.log(`\n=== DATABASE CONTENTS (${data?.length ?? 0} total records) ===\n`);
  for (const [domain, rows] of Object.entries(grouped)) {
    console.log(`--- Source: ${domain} (${rows.length} records) ---`);
    for (const r of rows) {
      console.log(`  [${r.verified ? 'VERIFIED' : 'unverified'}] ${r.name} | ${r.city} | ${r.email ?? 'no email'}`);
    }
    console.log('');
  }

  // Highlight suspicious records
  const junk = (data ?? []).filter(r => {
    const name = (r.name ?? '').toLowerCase();
    return (
      name.length < 3 ||
      name.includes('vellani & vellani') ||
      name.includes('blog') ||
      name.includes('join for') ||
      name.includes('legal call') ||
      name.includes('usefull') ||
      name.includes('email support') ||
      /^\d+$/.test(name)
    );
  });

  if (junk.length > 0) {
    console.log(`\n=== JUNK / BAD RECORDS TO CLEAN (${junk.length}) ===`);
    for (const r of junk) {
      console.log(`  [${r.id}] "${r.name}" | ${r.city} | ${r.source_url}`);
    }
  } else {
    console.log('No obvious junk records found.');
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
