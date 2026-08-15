export const GRID_ROWS = 'ABCDEFGHIJK' as const
export const GRID_COLS = 10
export const GRID_ROW_COUNT = GRID_ROWS.length

/** Квадрат карты по процентам (0–100), напр. D6 */
export function squareAt(xPct: number, yPct: number): string {
  const col = Math.min(GRID_COLS, Math.max(1, Math.floor((xPct / 100) * GRID_COLS) + 1))
  const row = Math.min(
    GRID_ROW_COUNT - 1,
    Math.max(0, Math.floor((yPct / 100) * GRID_ROW_COUNT)),
  )
  return `${GRID_ROWS[row]}${col}`
}
