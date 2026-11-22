import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { cellValue, filterOptions, nextSort, pageOf, tabCounts, visibleRows } from './dataTableModel'
import './data-table.css'

// Shared table for every record list (UI redesign rule 6, CORE-FLOW-WORKSPACE.md):
// search, select filters and status tabs sit in one toolbar above the table; no filter modals.
// columns: { key, label, render?(row), value?(row), sortable?, searchable?, align?, width? }
// filters: { key, label, value?(row), options? } · tabs: { key, label, match?(row) } · rowProps?(row): extra <tr> attributes · openLabel?(row): name of the row's open button
export default function DataTable({
  label, columns, rows = [], rowKey = 'id', filters = [], tabs = [], searchPlaceholder = 'Search',
  onRowClick, empty = 'Nothing to show yet.', noMatch = 'No rows match these filters.', pageSize = 25,
  initialSort = null, initialTab, actions, dense = false, className = '', rowProps, openLabel,
}) {
  const [query, setQuery] = useState(''), [chosen, setChosen] = useState({})
  const [tab, setTab] = useState(initialTab || tabs[0]?.key), [sort, setSort] = useState(initialSort), [page, setPage] = useState(1)
  const counts = useMemo(() => tabCounts(rows, tabs), [rows, tabs])
  const matching = useMemo(() => visibleRows(rows, columns, { query, filters: chosen, tab, sort }, filters, tabs), [rows, columns, query, chosen, tab, sort, filters, tabs])
  const shown = pageOf(matching, page, pageSize)
  const keyOf = (row, index) => typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index
  const reset = update => { update(); setPage(1) }
  const filtered = Boolean(query || Object.values(chosen).some(Boolean))

  return <section className={`dt ${dense ? 'dt-dense' : ''} ${className}`} aria-label={label}>
    <div className="dt-toolbar">
      {tabs.length > 0 && <div className="dt-tabs" role="group" aria-label={`${label} status`}>
        {tabs.map(item => <button key={item.key} type="button" aria-pressed={tab === item.key} className="dt-tab" onClick={() => reset(() => setTab(item.key))}>
          {item.label}{' '}<span className="dt-count">{counts[item.key]}</span>
        </button>)}
      </div>}
      <div className="dt-filters">
        <label className="dt-search"><Search size={15} aria-hidden="true" />
          <input type="search" value={query} placeholder={searchPlaceholder} aria-label={`Search ${label}`} onChange={event => reset(() => setQuery(event.target.value))} />
        </label>
        {filters.map(filter => <label key={filter.key} className="dt-select"><span className="sr-only">{filter.label}</span>
          <select value={chosen[filter.key] || ''} aria-label={filter.label} onChange={event => reset(() => setChosen(previous => ({ ...previous, [filter.key]: event.target.value })))}>
            <option value="">All {filter.label.toLowerCase()}</option>
            {filterOptions(rows, filter).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>)}
        {filtered && <button type="button" className="dt-clear" onClick={() => reset(() => { setQuery(''); setChosen({}) })}>Clear</button>}
        {actions && <div className="dt-actions">{actions}</div>}
      </div>
    </div>

    <div className="dt-scroll">
      <table className="dt-table">
        <caption className="sr-only">{label}</caption>
        <thead><tr>{columns.map(column => {
          const sortable = column.sortable !== false, active = sort?.key === column.key
          return <th key={column.key} scope="col" style={{ width: column.width, textAlign: column.align }} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
            {sortable ? <button type="button" className="dt-sort" onClick={() => setSort(previous => nextSort(previous, column.key))}>
              {column.label}{active && (sort.direction === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />)}
            </button> : column.label}
          </th>
        })}</tr></thead>
        <tbody>
          {shown.rows.map((row, index) => { const extra = rowProps?.(row) || {}; return <tr key={keyOf(row, index)} {...extra} className={[onRowClick ? 'dt-clickable' : '', extra.className || ''].join(' ').trim() || undefined} onClick={onRowClick ? event => { if (!event.target.closest('button, a, input, select, textarea')) onRowClick(row) } : undefined}>
            {columns.map((column, columnIndex) => {
              const content = column.render ? column.render(row) : cellValue(row, column) ?? '—'
              return <td key={column.key} style={{ textAlign: column.align }} data-label={column.label}>
                {onRowClick && columnIndex === 0 ? <button type="button" className="dt-open" aria-label={openLabel?.(row)} onClick={() => onRowClick(row)}>{content}</button> : content}
              </td>
            })}
          </tr> })}
        </tbody>
      </table>
      {!shown.total && <p className="dt-empty" role="status">{rows.length ? noMatch : empty}</p>}
    </div>

    {shown.total > 0 && <div className="dt-footer">
      <span>{shown.start}–{shown.end} of {shown.total}</span>
      {shown.pages > 1 && <span className="dt-pager">
        <button type="button" aria-label="Previous page" disabled={shown.page === 1} onClick={() => setPage(shown.page - 1)}><ChevronLeft size={16} /></button>
        <span>Page {shown.page} of {shown.pages}</span>
        <button type="button" aria-label="Next page" disabled={shown.page === shown.pages} onClick={() => setPage(shown.page + 1)}><ChevronRight size={16} /></button>
      </span>}
    </div>}
  </section>
}

/** Small colored status label used in table cells (Classroom gradebook colors). */
export function StatusPill({ tone = 'neutral', children }) {
  return <span className={`dt-pill dt-pill-${tone}`}>{children}</span>
}
