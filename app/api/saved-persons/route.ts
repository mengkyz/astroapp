import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Saved persons contain personal data (names, birth data, GPS) and must NOT
// live under public/ where any visitor could download them. They are stored
// in a private data/ directory at the project root instead.
const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_PATH = path.join(DATA_DIR, 'savedPersons.csv');
// Old location (publicly served) — migrated away from on first read.
const LEGACY_CSV_PATH = path.join(process.cwd(), 'public', 'data', 'savedPersons.csv');

const CSV_HEADER =
  'id,firstNameEn,lastNameEn,nicknameEn,firstNameTh,lastNameTh,nicknameTh,day,month,year,hour,minute,second,utcOffset,locationNameEn,locationNameTh,latitude,longitude,quickSelectP,quickSelectD,quickSelectS';

// Files written before the utcOffset column had 20 fields; assume Thailand (+7).
const LEGACY_FIELD_COUNT = 20;
const DEFAULT_UTC_OFFSET = 7;

const MAX_PERSONS = 2000;

interface SavedPerson {
  id: string;
  firstNameEn: string; lastNameEn: string; nicknameEn: string;
  firstNameTh: string; lastNameTh: string; nicknameTh: string;
  day: number; month: number; year: number;
  hour: number; minute: number; second: number;
  utcOffset: number;
  locationNameEn: string; locationNameTh: string;
  latitude: number | string; longitude: number | string;
  quickSelect: { p: string; d: string; s: string } | null;
}

function csvField(val: string | number): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
  }
  fields.push(cur);
  return fields;
}

/** One-time migration: move the CSV out of the public folder. */
function migrateLegacyFile(): void {
  if (fs.existsSync(CSV_PATH) || !fs.existsSync(LEGACY_CSV_PATH)) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.copyFileSync(LEGACY_CSV_PATH, CSV_PATH);
  fs.unlinkSync(LEGACY_CSV_PATH);
}

function readPersons(): SavedPerson[] {
  migrateLegacyFile();
  if (!fs.existsSync(CSV_PATH)) return [];
  const lines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').filter(Boolean);
  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    // Rows from before the utcOffset column: splice in the Thai default so the
    // remaining columns line up.
    if (fields.length === LEGACY_FIELD_COUNT) {
      fields.splice(13, 0, String(DEFAULT_UTC_OFFSET));
    }
    const [
      id, firstNameEn, lastNameEn, nicknameEn,
      firstNameTh, lastNameTh, nicknameTh,
      day, month, year, hour, minute, second, utcOffset,
      locationNameEn, locationNameTh,
      latitude, longitude,
      quickSelectP, quickSelectD, quickSelectS,
    ] = fields;
    const parsedOffset = Number(utcOffset);
    return {
      id, firstNameEn, lastNameEn, nicknameEn,
      firstNameTh, lastNameTh, nicknameTh,
      day: Number(day), month: Number(month), year: Number(year),
      hour: Number(hour), minute: Number(minute), second: Number(second),
      utcOffset: Number.isFinite(parsedOffset) ? parsedOffset : DEFAULT_UTC_OFFSET,
      locationNameEn, locationNameTh,
      latitude, longitude,
      quickSelect: quickSelectP ? { p: quickSelectP, d: quickSelectD ?? '', s: quickSelectS ?? '' } : null,
    };
  });
}

function writePersons(persons: SavedPerson[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const rows = persons.map((p) =>
    [
      csvField(p.id),
      csvField(p.firstNameEn), csvField(p.lastNameEn), csvField(p.nicknameEn),
      csvField(p.firstNameTh), csvField(p.lastNameTh), csvField(p.nicknameTh),
      csvField(p.day), csvField(p.month), csvField(p.year),
      csvField(p.hour), csvField(p.minute), csvField(p.second),
      csvField(p.utcOffset),
      csvField(p.locationNameEn), csvField(p.locationNameTh),
      csvField(p.latitude), csvField(p.longitude),
      csvField(p.quickSelect?.p ?? ''),
      csvField(p.quickSelect?.d ?? ''),
      csvField(p.quickSelect?.s ?? ''),
    ].join(',')
  );
  // Atomic write: a crash mid-write must not corrupt the existing file
  const tmpPath = `${CSV_PATH}.tmp`;
  fs.writeFileSync(tmpPath, [CSV_HEADER, ...rows].join('\n') + '\n', 'utf-8');
  fs.renameSync(tmpPath, CSV_PATH);
}

function isValidPerson(p: unknown): p is SavedPerson {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  const isStr = (v: unknown) => typeof v === 'string';
  const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const isLatLng = (v: unknown) => isNum(v) || isStr(v);
  return (
    isStr(o.id) && (o.id as string).length > 0 && (o.id as string).length <= 64 &&
    isStr(o.firstNameEn) && isStr(o.lastNameEn) && isStr(o.nicknameEn) &&
    isStr(o.firstNameTh) && isStr(o.lastNameTh) && isStr(o.nicknameTh) &&
    isNum(o.day) && isNum(o.month) && isNum(o.year) &&
    isNum(o.hour) && isNum(o.minute) && isNum(o.second) &&
    isNum(o.utcOffset) && Math.abs(o.utcOffset as number) <= 14 &&
    isStr(o.locationNameEn) && isStr(o.locationNameTh) &&
    isLatLng(o.latitude) && isLatLng(o.longitude) &&
    (o.quickSelect === null ||
      (typeof o.quickSelect === 'object' && o.quickSelect !== null))
  );
}

export async function GET() {
  try {
    const persons = readPersons();
    return NextResponse.json(persons);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!Array.isArray(body) || body.length > MAX_PERSONS) {
      return NextResponse.json(
        { ok: false, error: 'Expected an array of saved persons.' },
        { status: 400 },
      );
    }
    if (!body.every(isValidPerson)) {
      return NextResponse.json(
        { ok: false, error: 'One or more persons have invalid fields.' },
        { status: 400 },
      );
    }
    writePersons(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
