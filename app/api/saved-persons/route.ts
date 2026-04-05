import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'public', 'data', 'savedPersons.csv');
const CSV_HEADER = 'id,firstName,lastName,nickname,day,month,year,hour,minute,second,locationName,latitude,longitude,quickSelectP,quickSelectD,quickSelectS';

interface SavedPerson {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
  locationName: string;
  latitude: number | string;
  longitude: number | string;
  quickSelect: { p: string; d: string; s: string } | null;
}

function csvField(val: string | number): string {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function parseField(val: string): string {
  if (val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1).replace(/""/g, '"');
  }
  return val;
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
  // skip header
  return lines.slice(1).map((line) => {
    const [id, firstName, lastName, nickname, day, month, year, hour, minute, second, locationName, latitude, longitude, quickSelectP, quickSelectD, quickSelectS] = parseCsvLine(line);
    return {
      id: parseField(id),
      firstName: parseField(firstName),
      lastName: parseField(lastName),
      nickname: parseField(nickname),
      day: Number(day),
      month: Number(month),
      year: Number(year),
      hour: Number(hour),
      minute: Number(minute),
      second: Number(second),
      locationName: parseField(locationName),
      latitude: parseField(latitude),
      longitude: parseField(longitude),
      quickSelect: quickSelectP ? { p: parseField(quickSelectP), d: parseField(quickSelectD), s: parseField(quickSelectS) } : null,
    };
  });
}

function writePersons(persons: SavedPerson[]): void {
  const rows = persons.map((p) =>
    [
      csvField(p.id),
      csvField(p.firstName),
      csvField(p.lastName),
      csvField(p.nickname),
      csvField(p.day),
      csvField(p.month),
      csvField(p.year),
      csvField(p.hour),
      csvField(p.minute),
      csvField(p.second),
      csvField(p.locationName),
      csvField(p.latitude),
      csvField(p.longitude),
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
