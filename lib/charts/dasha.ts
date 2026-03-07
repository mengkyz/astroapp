import dayjs from 'dayjs';

const DASHA_ORDER = [
  'KETU',
  'VENUS',
  'SUN',
  'MOON',
  'MARS',
  'RAHU',
  'JUPITER',
  'SATURN',
  'MERCURY',
];
const DASHA_YEARS: Record<string, number> = {
  KETU: 7,
  VENUS: 20,
  SUN: 6,
  MOON: 10,
  MARS: 7,
  RAHU: 18,
  JUPITER: 16,
  SATURN: 19,
  MERCURY: 17,
};

// HELPER: Converts decimal years into precise Traditional Jyotish Y/M/D
// (Assuming exactly 12 months per year, and 30 days per month for the fraction)
function decimalToYMD(decimalYears: number) {
  const years = Math.floor(decimalYears);
  const remainderMonths = (decimalYears - years) * 12;
  const months = Math.floor(remainderMonths);
  const days = Math.round((remainderMonths - months) * 30);

  return { years, months, days };
}

export function calculateVimshottariDasha(
  moonLongitude: number,
  birthDateLocalStr: string,
) {
  const nakshatraSpan = 360 / 27;
  const nakIndex = Math.floor(moonLongitude / nakshatraSpan);
  const elapsedFrac = (moonLongitude % nakshatraSpan) / nakshatraSpan;

  // The Dasha sequence loops continuously
  const startLordIndex = nakIndex % 9;
  const startLord = DASHA_ORDER[startLordIndex];
  const totalYears = DASHA_YEARS[startLord];

  // Calculate the exact elapsed time in Y/M/D
  const elapsedDecimalYears = elapsedFrac * totalYears;
  const elapsed = decimalToYMD(elapsedDecimalYears);

  // THE CALENDAR WALK: Subtract the exact years, months, and days from the birth date
  const birthDate = dayjs(birthDateLocalStr);
  let currentStartDate = birthDate
    .subtract(elapsed.years, 'year')
    .subtract(elapsed.months, 'month')
    .subtract(elapsed.days, 'day');

  const dashas = [];

  for (let i = 0; i < 9; i++) {
    const mahaIndex = (startLordIndex + i) % 9;
    const mahaLord = DASHA_ORDER[mahaIndex];
    const mahaYears = DASHA_YEARS[mahaLord];

    const mahaStartDate = currentStartDate.clone();

    // Maha Dasha end date is exactly X years later
    const mahaEndDate = mahaStartDate.add(mahaYears, 'year');

    const bhuktis = [];
    let bhuktiStartDate = mahaStartDate.clone();

    for (let j = 0; j < 9; j++) {
      const subIndex = (mahaIndex + j) % 9;
      const subLord = DASHA_ORDER[subIndex];
      const subYears = DASHA_YEARS[subLord];

      // Proportional duration logic: (Maha * Bhukti / 120)
      const bhuktiDecimalYears = (mahaYears * subYears) / 120;
      const bhukti = decimalToYMD(bhuktiDecimalYears);

      // THE CALENDAR WALK: Add the exact years, months, and days to step forward
      const bhuktiEndDate = bhuktiStartDate
        .add(bhukti.years, 'year')
        .add(bhukti.months, 'month')
        .add(bhukti.days, 'day');

      bhuktis.push({
        lord: subLord,
        startDate: bhuktiStartDate.format('YYYY-MM-DDTHH:mm:ss'),
        endDate: bhuktiEndDate.format('YYYY-MM-DDTHH:mm:ss'),
      });

      bhuktiStartDate = bhuktiEndDate;
    }

    dashas.push({
      lord: mahaLord,
      years: mahaYears,
      startDate: mahaStartDate.format('YYYY-MM-DDTHH:mm:ss'),
      endDate: mahaEndDate.format('YYYY-MM-DDTHH:mm:ss'),
      bhuktis,
    });

    // The next Maha Dasha starts exactly when this one ends
    currentStartDate = mahaEndDate;
  }

  return {
    firstLord: startLord,
    elapsedFraction: elapsedFrac,
    dashas,
  };
}
