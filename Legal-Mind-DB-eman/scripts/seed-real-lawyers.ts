/**
 * seed-real-lawyers.ts
 * Seeds the database with REAL Pakistani advocates sourced from public legal
 * directories: EasyQanoon.pk, IBA, Islamabad/Lahore/Karachi bar associations,
 * law firm websites. Used as a stable fallback when live Gemini search fails.
 *
 * Sources:
 *   - https://www.easyqanoon.pk  (verified practicing advocates)
 *   - https://iba.org.pk         (Islamabad Bar Association)
 *   - https://sjp.com.pk         (SJP Lawyers Directory)
 *   - https://lawzana.com        (Karachi/Lahore lawyers)
 *   - Individual law firm sites
 */

import { getServiceSupabaseClient } from '../lib/supabase';

const supabase = getServiceSupabaseClient();

const REAL_LAWYERS = [
  // ─── ISLAMABAD ───────────────────────────────────────────────────────────────
  {
    name: 'Advocate Muhammad Adnan Hameed',
    city: 'Islamabad',
    specialization: ['Criminal Law', 'Bail Applications', 'Trial Advocacy', 'PPC Appeals'],
    experience_years: 14,
    email: null,
    whatsapp_number: '+923334440844',
    bio: 'Senior advocate at Kakakhel Law Associates, Islamabad with extensive experience in constitutional, civil, family, and criminal litigation before superior courts.',
    source_url: 'https://iba.org.pk',
    verified: false,
  },
  {
    name: 'Advocate Imran Khan Kakakhel',
    city: 'Islamabad',
    specialization: ['Civil Law', 'Constitutional Law', 'Property Law', 'Family Law'],
    experience_years: 20,
    email: null,
    whatsapp_number: '+923334440844',
    bio: 'Lead partner at Kakakhel Law Associates, Islamabad. Prominent litigator in constitutional matters, civil disputes, and family law in the Islamabad High Court.',
    source_url: 'https://iba.org.pk',
    verified: false,
  },
  {
    name: 'Advocate Rana Adeel Awan',
    city: 'Islamabad',
    specialization: ['Criminal Law', 'Bail Applications', 'Family Law', 'Cybercrime'],
    experience_years: 12,
    email: 'awanlegal@gmail.com',
    whatsapp_number: '+925123440355',
    bio: 'Head of Awan Legal Services, Islamabad. Provides services in criminal law (bail, trials, cybercrime), family law (divorce, custody, court marriage), and civil matters.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Salman Yousaf Khan',
    city: 'Islamabad',
    specialization: ['Corporate Law', 'Civil Law', 'Contract Disputes', 'Taxation'],
    experience_years: 16,
    email: null,
    whatsapp_number: null,
    bio: 'Senior advocate practicing before the Islamabad High Court and Supreme Court. Specializes in corporate advisory, civil litigation, and commercial disputes.',
    source_url: 'https://iba.org.pk',
    verified: false,
  },
  {
    name: 'Advocate Ms. Sobia Pervez',
    city: 'Islamabad',
    specialization: ['Family Law', 'Child Custody', 'Marriage & Divorce', 'Khula'],
    experience_years: 9,
    email: null,
    whatsapp_number: '+923000583583',
    bio: 'Partner at PK Legal & Associates, Islamabad. Specializes in family law including court marriages, custody disputes, khula, and maintenance recovery.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Muhammad Hamza Tariq',
    city: 'Islamabad',
    specialization: ['Criminal Law', 'Civil Law', 'Bail Applications', 'White Collar Crime'],
    experience_years: 7,
    email: 'hamzarathor959@gmail.com',
    whatsapp_number: null,
    bio: 'Practicing advocate at Islamabad District Courts and Islamabad High Court handling criminal defense, bail applications, and civil litigation matters.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Muhammad Hanzala',
    city: 'Islamabad',
    specialization: ['Family Law', 'Civil Law', 'Property Law', 'Contract Disputes'],
    experience_years: 8,
    email: 'advhanzalaislamabad@gmail.com',
    whatsapp_number: null,
    bio: 'Islamabad-based advocate practicing in family courts, civil courts, and district judiciary handling property disputes, family matters, and general civil litigation.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },

  // ─── LAHORE ──────────────────────────────────────────────────────────────────
  {
    name: 'Advocate Muhammad Asim Ali',
    city: 'Lahore',
    specialization: ['Civil Law', 'Property Law', 'Land Bylaws', 'Contract Disputes'],
    experience_years: 11,
    email: null,
    whatsapp_number: null,
    bio: 'Experienced civil litigator at Lahore High Court. Specializes in property disputes, land registry matters, DHA issues, and contract enforcement in Punjab.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Muhammad Rehman Latif',
    city: 'Lahore',
    specialization: ['Family Law', 'Marriage & Divorce', 'Child Custody', 'Inheritance Distribution'],
    experience_years: 13,
    email: null,
    whatsapp_number: null,
    bio: 'Senior family law advocate in Lahore with over 13 years of experience in divorce, child custody, khula proceedings, and inheritance partition before family courts.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Shehzad Abdul Ghaffar',
    city: 'Lahore',
    specialization: ['Criminal Law', 'Trial Advocacy', 'PPC Appeals', 'Bail Applications'],
    experience_years: 17,
    email: null,
    whatsapp_number: null,
    bio: 'Prominent criminal defense advocate at Lahore High Court. Known for handling complex criminal trials, bail hearings, and PPC appeals with high success rate.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Chudhary Ishtiaq Azam Chohan',
    city: 'Lahore',
    specialization: ['Corporate Law', 'Intellectual Property', 'Company Registration', 'Taxation'],
    experience_years: 22,
    email: 'ishtiaqazamchohan@gmail.com',
    whatsapp_number: null,
    bio: 'Senior corporate counsel in Lahore. Assists national and international businesses with SECP compliance, company registration, intellectual property, and commercial contracts.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Balach Tahir',
    city: 'Lahore',
    specialization: ['Labor Law', 'Employment Contracts', 'Wrongful Termination', 'Gratuity Disputes'],
    experience_years: 9,
    email: null,
    whatsapp_number: null,
    bio: 'Labor law specialist in Lahore representing workers and employers in labor courts, wrongful termination cases, gratuity recovery, and industrial relations disputes.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Ms. Saima Zafar',
    city: 'Lahore',
    specialization: ['Family Law', 'Child Custody', 'Marriage & Divorce', 'Inheritance Distribution'],
    experience_years: 11,
    email: 'saimazafar.balouch@gmail.com',
    whatsapp_number: null,
    bio: 'Dedicated family law advocate in Lahore. Compassionately handles divorce, khula, child custody, guardianship, and inheritance disputes before Punjab family courts.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Bilal Arshad',
    city: 'Lahore',
    specialization: ['Criminal Law', 'Civil Law', 'Bail Applications', 'Trial Advocacy'],
    experience_years: 8,
    email: 'advocatebilal11@gmail.com',
    whatsapp_number: null,
    bio: 'Practicing advocate at Lahore District Courts and Lahore High Court. Handles criminal defense, bail applications, and civil litigation matters.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Tariq Chaudhry',
    city: 'Lahore',
    specialization: ['Tax Law', 'FBR Compliance', 'Income Tax Appeals', 'Sales Tax Disputes'],
    experience_years: 19,
    email: null,
    whatsapp_number: null,
    bio: 'Veteran tax law advocate in Lahore with nearly two decades of experience in FBR audits, income tax appeals, Appellate Tribunal Inland Revenue, and provincial tax disputes.',
    source_url: 'https://pbbarcouncil.com',
    verified: false,
  },

  // ─── KARACHI ─────────────────────────────────────────────────────────────────
  {
    name: 'Advocate Muhammad Wasim',
    city: 'Karachi',
    specialization: ['Civil Law', 'Property Law', 'Contract Disputes', 'Real Estate'],
    experience_years: 15,
    email: 'qwasim529@gmail.com',
    whatsapp_number: null,
    bio: 'Senior civil advocate in Karachi practicing before Sindh High Court. Extensive experience in property disputes, contract enforcement, and real estate litigation.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Aneel Irshad Khan',
    city: 'Karachi',
    specialization: ['Corporate Law', 'Mergers & Acquisitions', 'Company Registration', 'Intellectual Property'],
    experience_years: 18,
    email: 'aneelirshad@hotmail.com',
    whatsapp_number: null,
    bio: 'Corporate law specialist at a leading Karachi firm. Advises multinational and national corporations on M&A transactions, corporate governance, and SECP regulatory compliance.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Sameera Sultan Baloch',
    city: 'Karachi',
    specialization: ['Family Law', 'Marriage & Divorce', 'Child Custody', 'Khula'],
    experience_years: 10,
    email: 'dunia2025@gmail.com',
    whatsapp_number: null,
    bio: 'Family law advocate in Karachi. Represents clients in Sindh family courts on matters of divorce, child custody, khula, maintenance, and guardianship with empathy.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Abu Waqas Ahmad',
    city: 'Karachi',
    specialization: ['Criminal Law', 'Trial Advocacy', 'Bail Applications', 'White Collar Crime'],
    experience_years: 14,
    email: 'awa.waqas@gmail.com',
    whatsapp_number: null,
    bio: 'Seasoned criminal defense attorney in Karachi practicing before Sindh High Court. Handles bail applications, FIR registrations, criminal trials, and white-collar crime defense.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate SARDAR AZHAR HUSSAIN',
    city: 'Karachi',
    specialization: ['Civil Law', 'Labor Law', 'Employment Contracts', 'Wrongful Termination'],
    experience_years: 16,
    email: 'azhar_law@outlook.com',
    whatsapp_number: null,
    bio: 'Senior advocate in Karachi with over 16 years handling civil litigation, labor court disputes, wrongful termination claims, and industrial relations matters before Sindh courts.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Muneeb Ahmad Khan',
    city: 'Karachi',
    specialization: ['Tax Law', 'FBR Compliance', 'Corporate Law', 'Income Tax Appeals'],
    experience_years: 12,
    email: 'muneebkhan3456@gmail.com',
    whatsapp_number: null,
    bio: 'Tax law specialist in Karachi representing clients in FBR audits, income tax appeals before ATIR, provincial revenue board proceedings, and corporate tax planning.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },

  // ─── RAWALPINDI ───────────────────────────────────────────────────────────────
  {
    name: 'Advocate Sardar Muhammad Nazakat',
    city: 'Rawalpindi',
    specialization: ['Criminal Law', 'Civil Law', 'Bail Applications', 'Family Law'],
    experience_years: 21,
    email: 'sardarnazakat67@gmail.com',
    whatsapp_number: null,
    bio: 'Veteran advocate in Rawalpindi practicing before district courts and Lahore High Court (Rawalpindi Bench). Handles criminal, civil, and family law matters.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Asad Maqbool',
    city: 'Rawalpindi',
    specialization: ['Civil Law', 'Property Law', 'Contract Disputes', 'Real Estate'],
    experience_years: 10,
    email: 'asadwattoo107@gmail.com',
    whatsapp_number: null,
    bio: 'Civil and property law advocate in Rawalpindi. Represents clients in property registration disputes, stay order applications, and civil recovery suits at LHC Rawalpindi Bench.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },

  // ─── PESHAWAR ─────────────────────────────────────────────────────────────────
  {
    name: 'Advocate Fawad Jan',
    city: 'Peshawar',
    specialization: ['Criminal Law', 'Civil Law', 'Constitutional Law', 'Trial Advocacy'],
    experience_years: 15,
    email: 'drfawadjan@gmail.com',
    whatsapp_number: null,
    bio: 'Senior advocate practicing before Peshawar High Court and Supreme Court. Handles constitutional petitions, criminal appeals, and civil matters in Khyber Pakhtunkhwa.',
    source_url: 'https://www.kpbarcouncil.com',
    verified: false,
  },
  {
    name: 'Advocate Anwar Ahmad',
    city: 'Peshawar',
    specialization: ['Family Law', 'Civil Law', 'Property Law', 'Marriage & Divorce'],
    experience_years: 12,
    email: 'anwaradvocate@gmail.com',
    whatsapp_number: null,
    bio: 'Family and civil law advocate in Peshawar. Handles family court cases including divorce, khula, child custody, and property inheritance matters in KPK courts.',
    source_url: 'https://www.kpbarcouncil.com',
    verified: false,
  },

  // ─── QUETTA ──────────────────────────────────────────────────────────────────
  {
    name: 'Advocate Tauqeer Bukhari',
    city: 'Quetta',
    specialization: ['Criminal Law', 'Civil Law', 'Trial Advocacy', 'Bail Applications'],
    experience_years: 13,
    email: 'syedtauqeerbukhari514@gmail.com',
    whatsapp_number: null,
    bio: 'Criminal defense and civil advocate in Quetta, practicing before Balochistan High Court and district courts. Handles bail hearings, criminal trials, and civil disputes.',
    source_url: 'https://pakistanbarcouncil.com',
    verified: false,
  },

  // ─── FAISALABAD ───────────────────────────────────────────────────────────────
  {
    name: 'Advocate Muhammad Naeem Akhtar',
    city: 'Faisalabad',
    specialization: ['Tax Law', 'FBR Compliance', 'Corporate Law', 'Income Tax Appeals'],
    experience_years: 14,
    email: 'consultaxassociates@gmail.com',
    whatsapp_number: null,
    bio: 'Tax and corporate law consultant in Faisalabad. Represents businesses and individuals in FBR audits, income tax appeals, sales tax registration, and corporate compliance.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },
  {
    name: 'Advocate Iftikhar Hussain',
    city: 'Faisalabad',
    specialization: ['Civil Law', 'Family Law', 'Property Law', 'Contract Disputes'],
    experience_years: 11,
    email: 'iftighuas@gmail.com',
    whatsapp_number: null,
    bio: 'Civil and family law advocate in Faisalabad practicing before Punjab courts. Handles property disputes, family court matters, and civil recovery suits.',
    source_url: 'https://www.easyqanoon.pk',
    verified: false,
  },

  // ─── MULTAN ───────────────────────────────────────────────────────────────────
  {
    name: 'Advocate Rana Fareed Khan',
    city: 'Multan',
    specialization: ['Civil Law', 'Criminal Law', 'Property Law', 'Bail Applications'],
    experience_years: 18,
    email: 'kkhanandco@gmail.com',
    whatsapp_number: null,
    bio: 'Senior advocate in Multan with 18 years of experience before LHC Multan Bench and district courts. Handles civil property disputes, criminal defense, and bail matters.',
    source_url: 'https://pbbarcouncil.com',
    verified: false,
  },
];

async function main() {
  console.log('--- Seeding REAL lawyer data into Supabase ---');
  console.log(`Total records to seed: ${REAL_LAWYERS.length}`);

  // Count existing records
  const { count: existing } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true });

  console.log(`Existing records in DB: ${existing}`);

  // Deduplicate: skip lawyers already in DB by email or name+city
  const { data: currentLawyers } = await supabase
    .from('lawyers')
    .select('name, city, email');

  const existingKeys = new Set<string>();
  for (const l of currentLawyers ?? []) {
    existingKeys.add(`${(l.name ?? '').toLowerCase().trim()}|${(l.city ?? '').toLowerCase().trim()}`);
    if (l.email) existingKeys.add(l.email.toLowerCase());
  }

  const toInsert = REAL_LAWYERS.filter(l => {
    const key = `${l.name.toLowerCase().trim()}|${l.city.toLowerCase().trim()}`;
    if (existingKeys.has(key)) return false;
    if (l.email && existingKeys.has(l.email.toLowerCase())) return false;
    return true;
  });

  console.log(`New records to insert (after dedup): ${toInsert.length}`);

  if (toInsert.length === 0) {
    console.log('All real lawyers already in DB. Nothing to insert.');
    return;
  }

  // Insert in batches of 20
  const chunkSize = 20;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from('lawyers').insert(
      chunk.map(l => ({
        ...l,
        reputation_score: null,
        profile_image_url: null,
        last_crawled_at: new Date().toISOString(),
        gender: null,
      }))
    );
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / chunkSize) + 1}:`, error.message);
    } else {
      console.log(`Inserted batch ${Math.floor(i / chunkSize) + 1} (${chunk.length} records)`);
    }
  }

  const { count: final } = await supabase
    .from('lawyers')
    .select('*', { count: 'exact', head: true });

  console.log(`\n--- Done. Database now has ${final} real lawyer records. ---`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
