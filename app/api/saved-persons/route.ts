import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'public', 'data', 'savedPersons.csv');
const CSV_HEADER =
  'id,firstNameEn,lastNameEn,nicknameEn,firstNameTh,lastNameTh,nicknameTh,day,month,year,hour,minute,second,locationNameEn,locationNameTh,latitude,longitude,quickSelectP,quickSelectD,quickSelectS';

interface SavedPerson {
  id: string;
  firstNameEn: string; lastNameEn: string; nicknameEn: string;
  firstNameTh: string; lastNameTh: string; nicknameTh: string;
  day: number; month: number; year: number;
  hour: number; minute: number; second: number;
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

function readPersons(): SavedPerson[] {
  if (!fs.existsSync(CSV_PATH)) return [];
  const lines = fs.readFileSync(CSV_PATH, 'utf-8').split('\n').filter(Boolean);
  return lines.slice(1).map((line) => {
    const [
      id, firstNameEn, lastNameEn, nicknameEn,
      firstNameTh, lastNameTh, nicknameTh,
      day, month, year, hour, minute, second,
      locationNameEn, locationNameTh,
      latitude, longitude,
      quickSelectP, quickSelectD, quickSelectS,
    ] = parseCsvLine(line);
    return {
      id, firstNameEn, lastNameEn, nicknameEn,
      firstNameTh, lastNameTh, nicknameTh,
      day: Number(day), month: Number(month), year: Number(year),
      hour: Number(hour), minute: Number(minute), second: Number(second),
      locationNameEn, locationNameTh,
      latitude, longitude,
      quickSelect: quickSelectP ? { p: quickSelectP, d: quickSelectD ?? '', s: quickSelectS ?? '' } : null,
    };
  });
}

function writePersons(persons: SavedPerson[]): void {
  const rows = persons.map((p) =>
    [
      csvField(p.id),
      csvField(p.firstNameEn), csvField(p.lastNameEn), csvField(p.nicknameEn),
      csvField(p.firstNameTh), csvField(p.lastNameTh), csvField(p.nicknameTh),
      csvField(p.day), csvField(p.month), csvField(p.year),
      csvField(p.hour), csvField(p.minute), csvField(p.second),
      csvField(p.locationNameEn), csvField(p.locationNameTh),
      csvField(p.latitude), csvField(p.longitude),
      csvField(p.quickSelect?.p ?? ''),
      csvField(p.quickSelect?.d ?? ''),
      csvField(p.quickSelect?.s ?? ''),
    ].join(',')
  );
  fs.writeFileSync(CSV_PATH, [CSV_HEADER, ...rows].join('\n') + '\n', 'utf-8');
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
    const persons: SavedPerson[] = await req.json();
    writePersons(persons);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
