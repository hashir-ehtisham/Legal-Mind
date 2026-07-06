import { SeedSource } from './types';

export const GENERIC_SELECTORS = {
  card: [
    '.lawyer-card',
    '.member-card',
    '.profile',
    '.profile-card',
    '.team-member',
    '.attorney',
    '.lawyer',
    '.person',
    '.staff',
    '.member',
    '.our-team .row .col-md-4',
    '.team-grid-item',
    '.team-item',
    'tr.member-card'
  ],
  name: [
    '.name',
    'h3.name',
    'h4.name',
    '.title',
    '.lawyer-name',
    '.profile-name',
    '.member-name',
    'h1',
    'h2',
    'h3',
    '.attorney-name',
    'td.name'
  ],
  phone: [
    '.phone',
    '.tel',
    '.telephone',
    '.contact-phone',
    'a[href^="tel:"]',
    'td.phone',
    'p:contains("Phone")',
    'p:contains("Cell")',
    'li:contains("Phone")',
    '.member-phone'
  ],
  whatsapp: [
    '.whatsapp',
    'a[href*="wa.me"]',
    'a[href*="whatsapp"]',
    'p:contains("WhatsApp")',
    'p:contains("Whatsapp")',
    'td.whatsapp'
  ],
  email: [
    '.email',
    '.mail',
    'a[href^="mailto:"]',
    'td.email',
    'p:contains("Email")',
    'li:contains("Email")',
    '.member-email'
  ],
  address: [
    '.address',
    '.location',
    '.office',
    'p:contains("Address")',
    'li:contains("Address")',
    'td.address'
  ],
  city: [
    '.city',
    '.location-city',
    '.member-city',
    'td.city',
    'p:contains("City")',
    'li:contains("City")'
  ],
  bio: [
    '.bio',
    '.biography',
    '.about',
    '.description',
    '.profile-text',
    '.lawyer-bio',
    '.about-me',
    '.details',
    'td.bio'
  ],
  practiceAreas: [
    '.practice-areas',
    '.specialization',
    '.areas-of-practice',
    '.services',
    'li:contains("Practice Area")',
    'p:contains("Practice Area")',
    'div:contains("Practice Areas")'
  ],
  experience: [
    '.experience',
    '.years',
    '.practice-years',
    'p:contains("Experience")',
    'li:contains("Experience")',
    'p:contains("years")'
  ],
  languages: [
    '.languages',
    '.languages-spoken',
    'p:contains("Language")',
    'li:contains("Language")'
  ],
  barEnrollment: [
    '.bar-enrollment',
    '.enrollment',
    'p:contains("Enrollment")',
    'li:contains("Enrollment")',
    'p:contains("Bar Council")'
  ],
  court: [
    '.court',
    '.courts',
    'p:contains("Court")',
    'li:contains("Court")'
  ],
  lawFirm: [
    '.law-firm',
    '.firm',
    '.company',
    'p:contains("Firm")',
    'li:contains("Firm")'
  ],
  website: [
    '.website',
    'a[target="_blank"]',
    'p:contains("Website")',
    'li:contains("Website")'
  ],
  linkedin: [
    'a[href*="linkedin.com"]'
  ],
  position: [
    '.position',
    '.job-title',
    '.title',
    'p:contains("Position")',
    'li:contains("Position")',
    'p:contains("Partner")',
    'p:contains("Associate")'
  ]
};

export const SEED_SOURCES: SeedSource[] = [
  {
    name: 'Pakistan Bar Council',
    baseUrl: 'https://pakistanbarcouncil.com',
    directoryUrl: 'https://pakistanbarcouncil.com',
    profileSelector: 'a[href*="member"], a[href*="advocate"], .profile-link',
    paginationSelector: '.pagination a, a.page-link'
  },
  {
    name: 'Punjab Bar Council',
    baseUrl: 'https://pbbarcouncil.com',
    directoryUrl: 'https://pbbarcouncil.com',
    profileSelector: 'a[href*="member"], a[href*="advocate"]',
    paginationSelector: '.pagination a',
    cityHint: 'Lahore'
  },
  {
    name: 'Islamabad Bar Council',
    baseUrl: 'https://www.ibc.org.pk',
    directoryUrl: 'https://www.ibc.org.pk/lawyers-verification/',
    profileSelector: 'a[href*="member"], a[href*="advocate"]',
    paginationSelector: '.pagination a',
    cityHint: 'Islamabad'
  },
  {
    name: 'Islamabad Bar Association',
    baseUrl: 'https://iba.org.pk',
    directoryUrl: 'https://iba.org.pk/search_lawyer-typ-2-id-0.html',
    profileSelector: 'a[href*="lawyer"], a[href*="profile"]',
    paginationSelector: '.pagination a'
  },
  {
    name: 'Islamabad High Court Bar Association',
    baseUrl: 'https://www.ihcba.org.pk',
    directoryUrl: 'https://www.ihcba.org.pk/search-lawyers',
    profileSelector: 'a[href*="lawyer"], a[href*="profile"]',
    paginationSelector: '.pagination a'
  },
  {
    name: 'Sindh Bar Council',
    baseUrl: 'https://sindhbarcouncil.org',
    directoryUrl: 'https://sindhbarcouncil.org',
    profileSelector: 'a[href*="member"], a[href*="advocate"]',
    paginationSelector: '.pagination a',
    cityHint: 'Karachi'
  },
  {
    name: 'Khyber Pakhtunkhwa Bar Council',
    baseUrl: 'https://www.kpbarcouncil.com',
    directoryUrl: 'https://www.kpbarcouncil.com',
    profileSelector: 'a[href*="member"], a[href*="advocate"]',
    paginationSelector: '.pagination a',
    cityHint: 'Peshawar'
  },
  // Law Firms
  {
    name: 'Cornelius & Lane',
    baseUrl: 'https://www.cornelius.com.pk',
    directoryUrl: 'https://www.cornelius.com.pk',
    profileSelector: '.team-member a, a[href*="team"], a[href*="people"]',
    cityHint: 'Lahore'
  },
  {
    name: 'Mandviwalla & Zafar',
    baseUrl: 'https://mandviwalla.com',
    directoryUrl: 'https://mandviwalla.com',
    profileSelector: 'a[href*="people"], a[href*="team"], a[href*="attorney"]'
  },
  {
    name: 'Vellani & Vellani',
    baseUrl: 'https://www.vellani.com',
    directoryUrl: 'https://www.vellani.com',
    profileSelector: 'a[href*="people"], a[href*="team"], a[href*="professionals"]',
    cityHint: 'Karachi'
  },
  {
    name: 'ABS & Co',
    baseUrl: 'https://www.absco.com.pk',
    directoryUrl: 'https://www.absco.com.pk',
    profileSelector: 'a[href*="people"], a[href*="team"], a[href*="professionals"]'
  },
  {
    name: 'Axis Law Chambers',
    baseUrl: 'https://axislaw.pk',
    directoryUrl: 'https://axislaw.pk',
    profileSelector: 'a[href*="people"], a[href*="team"], a[href*="professionals"]'
  }
];
