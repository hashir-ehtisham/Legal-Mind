export interface SeedSource {
  name: string;
  baseUrl: string;
  directoryUrl: string;
  profileSelector?: string; // CSS selector to extract profile URLs from listings
  paginationSelector?: string; // CSS selector for pagination links
  cardSelectors?: string[]; // Custom card selectors if generic fail
  profileSelectors?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    bio?: string;
    practiceAreas?: string;
    experience?: string;
    whatsapp?: string;
    languages?: string;
    barEnrollment?: string;
    court?: string;
    lawFirm?: string;
    website?: string;
    position?: string;
    linkedin?: string;
  };
  cityHint?: string; // Default city if parsing fails (e.g. "Lahore" for LHCBA)
}

export interface ExtractedLawyer {
  name: string;
  gender?: string;
  city: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  bio?: string;
  profileImageUrl?: string;
  sourceUrl: string;
  practiceAreas?: string[];
  experienceYears?: number;
  languages?: string[];
  barEnrollment?: string;
  court?: string;
  lawFirm?: string;
  website?: string;
  position?: string;
  linkedin?: string;
}

export interface CrawlStats {
  site: string;
  pagesCrawled: number;
  profilesFound: number;
  profilesParsed: number;
  profilesSkipped: number;
  profilesUpdated: number;
  profilesInserted: number;
  errors: string[];
  startTime: Date;
}
