// Pure row logic for DataTable: search, select filters, status tabs, sorting and paging.
// Kept free of React so the rules are unit-tested (tests/data-table.test.ts).

export type Row = Record<string, any>
export type Column = { key: string, label: string, value?: (row: Row) => unknown, sortable?: boolean, searchable?: boolean }
export type Filter = { key: string, label: string, value?: (row: Row) => unknown, options?: Array<string | { value: string, label: string }> }
export type Tab = { key: string, label: string, match?: (row: Row) => boolean }
export type TableState = { query?: string, filters?: Record<string, string>, tab?: string, sort?: { key: string, direction: 'asc' | 'desc' } | null, page?: number, pageSize?: number }

const plain = (value: unknown) => value == null ? '' : String(value)

export function cellValue(row: Row, column: Pick<Column, 'key' | 'value'>) {
  return column.value ? column.value(row) : row[column.key]
}

/** Distinct, sorted options for a filter when the caller gives none. */
export function filterOptions(rows: Row[], filter: Filter) {
  if (filter.options) return filter.options.map(option => typeof option === 'string' ? { value: option, label: option } : option)
  const values = new Set<string>()
  for (const row of rows) { const value = plain(cellValue(row, filter)); if (value) values.add(value) }
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(value => ({ value, label: value }))
}

export function tabCounts(rows: Row[], tabs: Tab[]) {
  return Object.fromEntries(tabs.map(tab => [tab.key, tab.match ? rows.filter(tab.match).length : rows.length]))
}

// Empty values stay last in both directions; `sign` flips only real comparisons.
function compare(a: unknown, b: unknown, sign: number) {
  const emptyA = a == null || a === '', emptyB = b == null || b === ''
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * sign
  if (a instanceof Date && b instanceof Date) return (a.getTime() - b.getTime()) * sign
  return plain(a).localeCompare(plain(b), undefined, { numeric: true, sensitivity: 'base' }) * sign
}

/** Applies tab, filters, search and sort; returns all matching rows (unpaged). */
export function visibleRows(rows: Row[], columns: Column[], state: TableState, filters: Filter[] = [], tabs: Tab[] = []) {
  const tab = tabs.find(item => item.key === state.tab)
  const terms = plain(state.query).trim().toLowerCase().split(/\s+/).filter(Boolean)
  const searchable = columns.filter(column => column.searchable !== false)
  const chosen = Object.entries(state.filters || {}).filter(([, value]) => value)
  const result = rows.filter(row => {
    if (tab?.match && !tab.match(row)) return false
    for (const [key, value] of chosen) {
      const filter = filters.find(item => item.key === key)
      if (filter && plain(cellValue(row, filter)) !== value) return false
    }
    if (!terms.length) return true
    const text = searchable.map(column => plain(cellValue(row, column))).join(' ').toLowerCase()
    return terms.every(term => text.includes(term))
  })
  const sortColumn = state.sort && columns.find(column => column.key === state.sort!.key)
  if (!sortColumn) return result
  const sign = state.sort!.direction === 'desc' ? -1 : 1
  return result.map((row, index) => ({ row, index }))
    .sort((a, b) => compare(cellValue(a.row, sortColumn), cellValue(b.row, sortColumn), sign) || a.index - b.index)
    .map(item => item.row)
}

/** Page window, clamped so a shrinking result never shows an empty page. */
export function pageOf<T>(rows: T[], page = 1, pageSize = 25) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(1, page), pages)
  const start = (current - 1) * pageSize
  return { rows: rows.slice(start, start + pageSize), page: current, pages, start: rows.length ? start + 1 : 0, end: Math.min(rows.length, start + pageSize), total: rows.length }
}

/** Header click cycle: ascending, descending, unsorted. */
export function nextSort(sort: TableState['sort'], key: string): TableState['sort'] {
  if (sort?.key !== key) return { key, direction: 'asc' }
  return sort.direction === 'asc' ? { key, direction: 'desc' } : null
}
