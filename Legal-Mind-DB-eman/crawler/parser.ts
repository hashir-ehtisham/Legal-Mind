import * as cheerio from 'cheerio';
import { SeedSource, ExtractedLawyer } from './types';
import { GENERIC_SELECTORS } from './selectors';

export class PageParser {
  /**
   * Helper to clean whitespace.
   */
  static cleanString(str: string): string {
    return str ? str.replace(/\s+/g, ' ').trim() : '';
  }

  /**
   * Parse a lawyer profile page.
   */
  static parseProfile(html: string, url: string, source: SeedSource): ExtractedLawyer {
    const $ = cheerio.load(html);

    const extractField = (fieldName: keyof typeof GENERIC_SELECTORS): string => {
      // 1. Try site-specific selector if configured
      if (source.profileSelectors && (source.profileSelectors as any)[fieldName]) {
        const specSel = (source.profileSelectors as any)[fieldName];
        const val = $(specSel).text();
        if (val) return this.cleanString(val);
      }

      // 2. Try generic selectors
      const gens = GENERIC_SELECTORS[fieldName] || [];
      for (const sel of gens) {
        const val = $(sel).text();
        if (val) return this.cleanString(val);
      }
      return '';
    };

    // Special extract for attributes/links
    const extractHref = (fieldName: 'email' | 'phone' | 'whatsapp' | 'linkedin' | 'website'): string => {
      if (source.profileSelectors && (source.profileSelectors as any)[fieldName]) {
        const specSel = (source.profileSelectors as any)[fieldName];
        const href = $(specSel).attr('href');
        if (href) return href.trim();
      }

      const gens = GENERIC_SELECTORS[fieldName] || [];
      for (const sel of gens) {
        const href = $(sel).attr('href');
        if (href) return href.trim();
      }
      return '';
    };

    // Extract Name
    let name = extractField('name');
    if (!name) {
      name = $('h1').first().text() || $('title').first().text() || '';
      name = this.cleanString(name).split('|')[0].split('-')[0].trim();
    }

    // Extract email from mailto
    let email = extractHref('email');
    if (email.startsWith('mailto:')) email = email.replace('mailto:', '').split('?')[0].trim();
    if (!email) email = extractField('email');

    // Extract phone from tel
    let phone = extractHref('phone');
    if (phone.startsWith('tel:')) phone = phone.replace('tel:', '').trim();
    if (!phone) phone = extractField('phone');

    // Extract whatsapp
    let whatsapp = extractHref('whatsapp');
    if (whatsapp) {
      const match = whatsapp.match(/(?:wa\.me|send\?phone=)(\d+)/);
      if (match) whatsapp = '+' + match[1];
    } else {
      whatsapp = extractField('whatsapp');
    }

    // Extract linkedin
    let linkedin = extractHref('linkedin');
    if (!linkedin) linkedin = extractField('linkedin');

    // Extract website
    let website = extractHref('website');
    if (!website) website = extractField('website');

    const address = extractField('address');
    const bio = extractField('bio');
    let city = extractField('city');

    const PAKISTANI_CITIES = [
      "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
    ];

    if (!city) {
      if (address) {
        for (const c of PAKISTANI_CITIES) {
          if (new RegExp(`\\b${c}\\b`, 'i').test(address)) {
            city = c;
            break;
          }
        }
      }
      if (!city && bio) {
        for (const c of PAKISTANI_CITIES) {
          if (new RegExp(`\\b${c}\\b`, 'i').test(bio)) {
            city = c;
            break;
          }
        }
      }
      if (!city && address) {
        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 0) {
          city = parts[parts.length - 1];
        }
      }
    }

    if (city) {
      const match = PAKISTANI_CITIES.find(c => c.toLowerCase() === city.toLowerCase());
      if (match) {
        city = match;
      }
    } else {
      city = 'Pakistan';
    }

    const bio = extractField('bio');
    const position = extractField('position');
    const barEnrollment = extractField('barEnrollment');
    const court = extractField('court');
    const lawFirm = extractField('lawFirm');

    // Extract practice areas
    let practiceAreas: string[] = [];
    const paText = extractField('practiceAreas');
    if (paText) {
      practiceAreas = paText.split(/[,;\n]/).map(p => this.cleanString(p)).filter(p => p.length > 0 && p.length < 50);
    }

    // Extract experience years
    let experienceYears: number | undefined;
    const expText = extractField('experience');
    if (expText) {
      const match = expText.match(/(\d+)\s*(?:years|yr)/i);
      if (match) {
        experienceYears = parseInt(match[1], 10);
      }
    }

    // Extract languages
    let languages: string[] = [];
    const langText = extractField('languages');
    if (langText) {
      languages = langText.split(/[,;\n]/).map(l => this.cleanString(l)).filter(l => l.length > 0 && l.length < 25);
    }

    // Image
    let profileImageUrl = '';
    const imgSel = 'img.profile-image, img.photo, .profile img, .member img';
    const src = $(imgSel).attr('src');
    if (src) {
      try {
        profileImageUrl = new URL(src, url).toString();
      } catch {
        // ignore malformed URLs
      }
    }

    return {
      name,
      city,
      phone: phone || undefined,
      whatsappNumber: whatsapp || undefined,
      email: email || undefined,
      bio: bio || undefined,
      profileImageUrl: profileImageUrl || undefined,
      sourceUrl: url,
      practiceAreas: practiceAreas.length > 0 ? practiceAreas : undefined,
      experienceYears,
      languages: languages.length > 0 ? languages : undefined,
      barEnrollment: barEnrollment || undefined,
      court: court || undefined,
      lawFirm: lawFirm || undefined,
      website: website || undefined,
      position: position || undefined,
      linkedin: linkedin || undefined
    };
  }

  /**
   * Parse listing page for profile URLs.
   */
  static parseListingLinks(html: string, source: SeedSource): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    
    const selectors = [];
    if (source.profileSelector) selectors.push(source.profileSelector);
    selectors.push('a[href*="/member/"]', 'a[href*="/profile/"]', 'a[href*="/lawyer/"]', 'a[href*="/team/"]', 'a[href*="/people/"]');

    for (const sel of selectors) {
      $(sel).each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, source.baseUrl).toString();
            if (absoluteUrl.startsWith(source.baseUrl) && !links.includes(absoluteUrl)) {
              links.push(absoluteUrl);
            }
          } catch {
            // ignore malformed URLs
          }
        }
      });
    }

    return links;
  }
}
