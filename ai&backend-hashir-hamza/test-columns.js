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

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Checking profiles.gmail_refresh_token_enc...');
  const { error: err1 } = await supabase
    .from('profiles')
    .select('gmail_refresh_token_enc')
    .limit(1);

  if (err1) {
    console.log('❌ profiles.gmail_refresh_token_enc does NOT exist. Error:', err1.message);
  } else {
    console.log('✅ profiles.gmail_refresh_token_enc exists!');
  }

  console.log('Checking case_lawyers.channel and suggested_reasoning...');
  const { error: err2 } = await supabase
    .from('case_lawyers')
    .select('channel, suggested_reasoning')
    .limit(1);

  if (err2) {
    console.log('❌ case_lawyers columns do NOT exist. Error:', err2.message);
  } else {
    console.log('✅ case_lawyers.channel and suggested_reasoning exist!');
  }
}

main();
