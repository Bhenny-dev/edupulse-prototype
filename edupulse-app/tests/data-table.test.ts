import test from 'node:test'
import assert from 'node:assert/strict'
import { filterOptions, nextSort, pageOf, tabCounts, visibleRows } from '../src/components/ui/dataTableModel.js'

const rows = [
  { id: 1, name: 'Ana Cruz', block: 'B', score: 88, status: 'Turned in' },
  { id: 2, name: 'Ben Lim', block: 'A', score: null, status: 'Missing' },
  { id: 3, name: 'Carla Diaz', block: 'A', score: 72, status: 'Graded' },
  { id: 4, name: 'Dan Reyes', block: 'B', score: 95, status: 'Missing' },
]
const columns = [{ key: 'name', label: 'Name' }, { key: 'block', label: 'Block' }, { key: 'score', label: 'Score', searchable: false }]
const filters = [{ key: 'block', label: 'Block' }]
const tabs = [{ key: 'all', label: 'All' }, { key: 'missing', label: 'Missing', match: (row: any) => row.status === 'Missing' }]

test('UI-TABLE-001: search, select filter and status tab combine', () => {
  assert.deepEqual(visibleRows(rows, columns, { query: 'an' }).map(row => row.id), [1, 4])
  assert.deepEqual(visibleRows(rows, columns, { query: 'an', filters: { block: 'A' } }, filters).map(row => row.id), [])
  assert.deepEqual(visibleRows(rows, columns, { query: 'ar', filters: { block: 'A' } }, filters).map(row => row.id), [3])
  assert.deepEqual(visibleRows(rows, columns, { tab: 'missing', filters: { block: 'A' } }, filters, tabs).map(row => row.id), [2])
  assert.deepEqual(visibleRows(rows, columns, { query: '88' }).map(row => row.id), [], 'columns marked searchable: false are not searched')
})

test('UI-TABLE-002: sorting keeps empty values last and is stable', () => {
  assert.deepEqual(visibleRows(rows, columns, { sort: { key: 'score', direction: 'asc' } }).map(row => row.id), [3, 1, 4, 2])
  assert.deepEqual(visibleRows(rows, columns, { sort: { key: 'score', direction: 'desc' } }).map(row => row.id), [4, 1, 3, 2])
  assert.deepEqual(visibleRows(rows, columns, { sort: { key: 'block', direction: 'asc' } }).map(row => row.id), [2, 3, 1, 4])
  assert.deepEqual(nextSort(null, 'name'), { key: 'name', direction: 'asc' })
  assert.deepEqual(nextSort({ key: 'name', direction: 'asc' }, 'name'), { key: 'name', direction: 'desc' })
  assert.equal(nextSort({ key: 'name', direction: 'desc' }, 'name'), null)
})

test('UI-TABLE-003: paging clamps and options and counts come from the rows', () => {
  assert.deepEqual(pageOf([1, 2, 3, 4, 5], 9, 2), { rows: [5], page: 3, pages: 3, start: 5, end: 5, total: 5 })
  assert.deepEqual(pageOf([], 1, 10), { rows: [], page: 1, pages: 1, start: 0, end: 0, total: 0 })
  assert.deepEqual(filterOptions(rows, filters[0]).map(option => option.value), ['A', 'B'])
  assert.deepEqual(tabCounts(rows, tabs), { all: 4, missing: 2 })
})
