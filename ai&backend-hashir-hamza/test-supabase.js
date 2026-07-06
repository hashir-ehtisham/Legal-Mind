const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Connecting to Supabase...');
  console.log('URL:', supabaseUrl);
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Test database connection by querying profiles table (which is standard in Supabase templates)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message);
    } else {
      console.log('Successfully connected to Supabase database!');
      console.log(`Found ${profiles.length} profiles.`);
      if (profiles.length > 0) {
        console.log('Profile columns:', Object.keys(profiles[0]));
        if ('gmail_refresh_token_enc' in profiles[0]) {
          console.log('✅ gmail_refresh_token_enc column already exists in profiles table.');
        } else {
          console.log('❌ gmail_refresh_token_enc column does NOT exist in profiles table yet. You need to run the migration!');
        }
      } else {
        console.log('No profiles found in the table. We cannot verify columns from empty rows this way, let us check table schema or run the migration directly.');
      }
    }

    // 2. Query case_lawyers table
    const { data: caseLawyers, error: caseLawyersError } = await supabase
      .from('case_lawyers')
      .select('*')
      .limit(1);

    if (caseLawyersError) {
      console.error('Error fetching case_lawyers:', caseLawyersError.message);
    } else {
      console.log('Successfully queried case_lawyers table.');
      if (caseLawyers.length > 0) {
        const cols = Object.keys(caseLawyers[0]);
        console.log('case_lawyers columns:', cols);
        const hasChannel = 'channel' in caseLawyers[0];
        const hasReasoning = 'suggested_reasoning' in caseLawyers[0];
        console.log(`✅ channel column exists: ${hasChannel}`);
        console.log(`✅ suggested_reasoning column exists: ${hasReasoning}`);
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

main();
