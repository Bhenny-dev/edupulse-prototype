type Week = { week: number; [field: string]: unknown }

/** Move teaching content between fixed calendar slots; exam rows and week numbers never move. */
export function swapTeachingWeeks<T extends Week>(rows: T[], from: number, to: number): T[] {
  if (from === to || !rows[from] || !rows[to] || [9, 18].includes(rows[from].week) || [9, 18].includes(rows[to].week)) return rows
  return rows.map((row, index) => index === from ? { ...rows[to]!, week: row.week } : index === to ? { ...rows[from]!, week: row.week } : row)
}
