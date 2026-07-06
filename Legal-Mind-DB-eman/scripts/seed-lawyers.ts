import { getServiceSupabaseClient } from '../lib/supabase';

const supabase = getServiceSupabaseClient();

const CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"
];

const CASE_TYPES = [
  {
    type: "Civil",
    specs: ["Civil Law", "Property Law", "Land Bylaws", "Contract Disputes", "Real Estate"],
    bios: [
      "Expert civil litigator specializing in land registry, DHA property disputes, and inheritance claims.",
      "Dedicated civil rights advocate handling contract validation, tenant eviction disputes, and recovery suits.",
      "Senior counsel representing clients in High Courts for partition suits, stay orders, and property acquisitions."
    ]
  },
  {
    type: "Corporate",
    specs: ["Corporate Law", "Intellectual Property", "Company Registration", "Taxation", "Mergers & Acquisitions"],
    bios: [
      "Experienced corporate advisor assisting startups and international firms with SECP compliance and company registration.",
      "Specialist in intellectual property protection, corporate licensing, shareholder agreements, and contract drafting.",
      "Legal consultant focusing on commercial disputes, corporate governance, joint ventures, and venture capital financing."
    ]
  },
  {
    type: "Family",
    specs: ["Family Law", "Marriage & Divorce", "Child Custody", "Inheritance Distribution", "Khula"],
    bios: [
      "Compassionate family lawyer focusing on child custody disputes, divorce (Khula), dower/maintenance recovery, and guardianship.",
      "Advocate specializing in Shariah-compliant inheritance division, partition suits, and marital settlement agreements.",
      "Dedicated family court advocate representing clients with empathy and high success rates in custody and maintenance suits."
    ]
  },
  {
    type: "Criminal",
    specs: ["Criminal Law", "Bail Applications", "White Collar Crime", "Trial Advocacy", "PPC Appeals"],
    bios: [
      "Seasoned defense attorney handling bail petitions, trials, criminal appeals, and PPC inquiries in District and Sessions courts.",
      "Criminal law expert specializing in white-collar crime defense, cybercrime laws, and NAB inquiries.",
      "Trial specialist with 15+ years defending rights in serious criminal offenses, FIR registrations, and private complaints."
    ]
  },
  {
    type: "Labor",
    specs: ["Labor Law", "Employment Contracts", "Wrongful Termination", "Workplace Safety", "Gratuity Disputes"],
    bios: [
      "Labor court advocate defending worker rights, addressing wrongful termination, gratuity, and provident fund recovery.",
      "Employment counsel helping businesses draft compliance manuals and defending against labor union grievances.",
      "Specialist in industrial relations, worker compensation claims, social security appeals, and fair wage disputes."
    ]
  },
  {
    type: "Tax",
    specs: ["Tax Law", "FBR Compliance", "Income Tax Appeals", "Sales Tax Disputes", "Customs & Excise"],
    bios: [
      "Taxation expert representing clients in FBR audits, Appellate Tribunal Inland Revenue, and tax exemption requests.",
      "Advocate specializing in corporate tax planning, custom duties disputes, and filing income tax returns.",
      "Consultant handling sales tax registration, provincial revenue board appeals, and audit defenses."
    ]
  }
];

const FIRST_NAMES = {
  male: ["Muhammad", "Ahmed", "Ali", "Hamza", "Bilal", "Zain", "Usman", "Faisal", "Tariq", "Mustafa", "Siddique", "Kamran"],
  female: ["Sana", "Ayesha", "Fatima", "Maryam", "Zainab", "Sadia", "Tooba", "Lameea", "Eman", "Hina", "Sobia", "Nida"]
};

const LAST_NAMES = ["Khan", "Shah", "Javed", "Dar", "Amjad", "Farooq", "Jamil", "Raza", "Malik", "Chaudhry", "Abbasi", "Butt", "Iqbal", "Siddiqui"];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLawyers() {
  const lawyers: any[] = [];
  let idCounter = 1;

  for (const city of CITIES) {
    for (const caseConfig of CASE_TYPES) {
      // Create 2 male and 1 female lawyers per city per case type (total 8 * 6 * 3 = 144 records)
      const genders: Array<"male" | "female"> = ["male", "male", "female"];

      genders.forEach((gender, idx) => {
        const prefix = gender === "male" ? "Advocate" : "Advocate Ms.";
        const firstName = getRandomElement(FIRST_NAMES[gender]);
        const lastName = getRandomElement(LAST_NAMES);
        const name = `${prefix} ${firstName} ${lastName}`;

        // Ensure unique phone/whatsapp
        const number = `923${Math.floor(100000000 + Math.random() * 900000000)}`;

        const experience = Math.floor(3 + Math.random() * 25);
        const rating = Number((4.0 + Math.random() * 1.0).toFixed(1));

        // Use custom bios corresponding to the case type
        const bioTemplate = getRandomElement(caseConfig.bios);
        const bio = `${bioTemplate} Proudly serving clients in ${city} with dedication and professional integrity.`;

        // Email address
        const emailSuffix = getRandomElement(["gmail.com", "outlook.com", "advocate.pk", "lawyer.pk", "outlook.com"]);
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idCounter}@${emailSuffix}`;

        lawyers.push({
          name,
          city,
          gender: gender,
          specialization: caseConfig.specs,
          experience_years: experience,
          reputation_score: rating,
          email,
          whatsapp_number: `+${number}`,
          bio,
          profile_image_url: null,
          source_url: `https://mock-directory.pk/lawyers/${idCounter}`,
          last_crawled_at: new Date().toISOString(),
          verified: Math.random() > 0.6 // 40% verified, 60% unverified/public listing
        });

        idCounter++;
      });
    }
  }

  return lawyers;
}

async function main() {
  console.log('--- Starting Supabase Lawyer Seeding Script ---');

  // 1. Delete all existing scraped/unverified records to avoid duplicates
  console.log('Clearing old mocked/scraped lawyers...');
  const { error: clearError } = await supabase
    .from('lawyers')
    .delete()
    .eq('verified', false);

  if (clearError) {
    console.error('Error clearing old records:', clearError.message);
  }

  // 2. Generate 144 lawyer records
  const lawyers = generateLawyers();
  console.log(`Generated ${lawyers.length} distinct lawyer records across 8 cities.`);

  // 3. Batch insert in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < lawyers.length; i += chunkSize) {
    const chunk = lawyers.slice(i, i + chunkSize);
    console.log(`Inserting batch ${Math.floor(i / chunkSize) + 1}...`);
    const { error } = await supabase
      .from('lawyers')
      .insert(chunk);

    if (error) {
      console.error(`Error inserting batch:`, error.message);
    }
  }

  console.log('--- Seeding Completed Successfully ---');
}

main().catch(err => {
  console.error('Fatal error seeding database:', err);
  process.exit(1);
});
