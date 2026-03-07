export interface BirthInput {
  name?: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number; // <--- Add this line!
  latitude: number;
  longitude: number;
  utcOffset: number;
}

export interface PlanetPosition {
  id: number; // swisseph internal ID
  key: string; // SUN, MOON, MARS, etc.
  nameTh: string; // Thai name (อาทิตย์)
  nameEn: string; // English name
  symbol: string; // ๑, ๒, ๓
  longitude: number; // Sidereal ecliptic longitude 0-360
  rasi: number; // 1-12 (Zodiac sign)
  degrees: number; // 0-29 within the sign
  minutes: number; // Arc minutes 0-59
  seconds: number; // Arc seconds 0-59
  drekkana: number; // 1-3
  navamsaSign: number; // 1-12
  nakshatraIndex: number; // 0-26
  pada: number; // 1-4
  house: number; // 1-12 from Lagna
  isRetrograde: boolean;
}

export interface NatalChart {
  input: BirthInput;
  julianDay: number;
  ayanamsa: number;
  lagna: PlanetPosition; // Ascendant (ลัคนา)
  planets: PlanetPosition[];
}
