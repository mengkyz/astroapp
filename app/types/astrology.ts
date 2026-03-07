export interface BirthInput {
  name: string;
  day: number; // 1-31
  month: number; // 1-12
  year: number; // CE (Gregorian, e.g., 1996)
  hour: number; // 0-23 local time
  minute: number; // 0-59
  latitude: number; // Decimal degrees N+
  longitude: number; // Decimal degrees E+
  utcOffset: number; // e.g., 7 for UTC+07:00 (Thailand)
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
