import { Language } from '@/lib/i18n/translations';

/** A saved birth-data entry. Shared by the UI and the saved-persons API. */
export interface SavedPerson {
  id: string;
  firstNameEn: string; lastNameEn: string; nicknameEn: string;
  firstNameTh: string; lastNameTh: string; nicknameTh: string;
  day: number; month: number; year: number;
  hour: number; minute: number; second: number;
  /** Hours east of UTC. Older saves lack this column; loaders default it to +7 (Thailand). */
  utcOffset: number;
  locationNameEn: string; locationNameTh: string;
  latitude: number | string; longitude: number | string;
  quickSelect: { p: string; d: string; s: string } | null;
}

export function personDisplayName(person: SavedPerson, lang: Language): string {
  const firstName = lang === 'th' ? (person.firstNameTh || person.firstNameEn) : (person.firstNameEn || person.firstNameTh);
  const lastName = lang === 'th' ? (person.lastNameTh || person.lastNameEn) : (person.lastNameEn || person.lastNameTh);
  const nickname = lang === 'th' ? (person.nicknameTh || person.nicknameEn) : (person.nicknameEn || person.nicknameTh);
  const full = [firstName, lastName].filter(Boolean).join(' ');
  return full || nickname || '—';
}

export function personLocName(person: SavedPerson, lang: Language): string {
  return lang === 'th'
    ? (person.locationNameTh || person.locationNameEn)
    : (person.locationNameEn || person.locationNameTh);
}
