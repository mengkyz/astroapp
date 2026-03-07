export function getRasi(longitude: number): number {
  return Math.floor(longitude / 30) + 1; // Returns 1-12
}

export function getDegreesInRasi(longitude: number) {
  const raw = longitude % 30;
  const deg = Math.floor(raw);
  const min = Math.floor((raw - deg) * 60);
  const sec = Math.round(((raw - deg) * 60 - min) * 60);
  return { deg, min, sec };
}
