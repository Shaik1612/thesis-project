import { Fragment, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'
import Skeleton from './Skeleton'
import EmptyState from './EmptyState'

// Token-driven, sortable, optionally-expandable data table. Designed for the
// dense desk + admin surfaces. Headers are sticky inside a scrollable container.
//
// Columns: array of
//   {
//     key:       string                              (required)
//     header:    string | ReactNode                  (required)
//     accessor:  string | (row) => any               (defaults to `key` lookup)
//     align:     'left' | 'right' | 'center'         (default 'left')
//     width:     string                              (e.g. '120px', '12rem')
//     sortable:  boolean
//     mono:      boolean                             (render with tabular-nums)
//     cell:      (value, row, index) => ReactNode    (custom renderer)
//     headerSr:  string                              (sr-only header text)
//   }
//
// `renderExpanded(row)` enables an expand chevron column.

function defaultAccessor(row, col) {
  if (typeof col.accessor === 'function') return col.accessor(row)
  const path = col.accessor ?? col.key
  return path.split('.').reduce((acc, k) => acc?.[k], row)
}

export default function DataTable({
  columns,
  rows,
  rowKey = (r, i) => r?.id ?? i,
  // Sort state. Either supply both for controlled, or omit for uncontrolled.
  sortBy,
  sortDir = 'asc',
  onSortChange,
  // Optional row click handler. Makes the whole row a button.
  onRowClick,
  renderExpanded,
  loading = false,
  loadingRows = 5,
  empty,
  dense = false,
  striped = false,
  className = '',
  headerClassName = '',
  ariaLabel,
}) {
  const [internalSort, setInternalSort] = useState({ by: null, dir: 'asc' })
  const isControlled = onSortChange != null
  const activeSort = isControlled ? { by: sortBy, dir: sortDir } : internalSort

  const handleSort = (col) => {
    if (!col.sortable) return
    const nextDir = activeSort.by === col.key && activeSort.dir === 'asc' ? 'desc' : 'asc'
    if (isControlled) onSortChange(col.key, nextDir)
    else setInternalSort({ by: col.key, dir: nextDir })
  }

  const sortedRows = (() => {
    if (loading) return []
    if (!activeSort.by) return rows
    const col = columns.find((c) => c.key === activeSort.by)
    if (!col) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = defaultAccessor(a, col)
      const bv = defaultAccessor(b, col)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv), undefined, { numeric: true })
    })
    if (activeSort.dir === 'desc') copy.reverse()
    return copy
  })()

  const [expanded, setExpanded] = useState(() => new Set())
  const toggleExpand = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-3'
  const headPad = dense ? 'px-3 py-2.5' : 'px-4 py-3'

  return (
    <div
      className={[
        'overflow-hidden rounded-2xl bg-surface-0 ring-1 ring-inset ring-surface-line shadow-sm',
        className,
      ].join(' ')}
    >
      <div className="max-h-full overflow-auto scrollbar-thin">
        <table className="w-full border-separate border-spacing-0 text-left text-sm" aria-label={ariaLabel}>
          <thead className="sticky top-0 z-10 bg-surface-50/95 backdrop-blur">
            <tr>
              {renderExpanded && (
                <th scope="col" className={['w-10 border-b border-surface-line text-ink-500', headPad].join(' ')}>
                  <span className="sr-only">Expand row</span>
                </th>
              )}
              {columns.map((col) => {
                const isSorted = activeSort.by === col.key
                const alignCls = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    className={[
                      headerClassName || 'border-b border-surface-line text-[11px] font-semibold uppercase tracking-wider text-ink-500',
                      headPad,
                      alignCls,
                    ].join(' ')}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className={[
                          'inline-flex items-center gap-1.5 rounded-md px-1 -mx-1 hover:text-ink-900',
                          isSorted ? 'text-brand-600' : '',
                        ].join(' ')}
                      >
                        {col.headerSr && <span className="sr-only">{col.headerSr}</span>}
                        <span>{col.header}</span>
                        <ArrowUpDown className={['h-3 w-3 transition-transform', isSorted && activeSort.dir === 'desc' ? 'rotate-180' : ''].join(' ')} />
                      </button>
                    ) : (
                      <>
                        {col.headerSr && <span className="sr-only">{col.headerSr}</span>}
                        <span>{col.header}</span>
                      </>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: loadingRows }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {renderExpanded && <td className={['border-b border-surface-line', cellPad].join(' ')} />}
                    {columns.map((col) => (
                      <td key={col.key} className={['border-b border-surface-line', cellPad].join(' ')}>
                        <Skeleton height="14px" width={col.width ?? '60%'} />
                      </td>
                    ))}
                  </tr>
                ))
              : sortedRows.length === 0
                ? (
                  <tr>
                    <td colSpan={columns.length + (renderExpanded ? 1 : 0)} className="bg-surface-0">
                      {empty ?? <EmptyState title="Nothing here yet" message="Records will appear here once they arrive." />}
                    </td>
                  </tr>
                )
                : sortedRows.map((row, idx) => {
                  const key = rowKey(row, idx)
                  const isExpanded = expanded.has(key)
                  const rowCls = [
                    'transition-colors',
                    striped && idx % 2 ? 'bg-surface-50' : 'bg-surface-0',
                    onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : 'hover:bg-surface-50',
                  ].join(' ')

                  return (
                    <Fragment key={key}>
                      <tr
                        className={rowCls}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        onKeyDown={onRowClick ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowClick(row)
                          }
                        } : undefined}
                      >
                        {renderExpanded && (
                          <td className={['border-b border-surface-line align-middle', cellPad].join(' ')}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpand(key)
                              }}
                              aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                              aria-expanded={isExpanded}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-500 hover:bg-surface-100 hover:text-ink-900"
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </td>
                        )}
                        {columns.map((col) => {
                          const value = defaultAccessor(row, col)
                          const alignCls = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          return (
                            <td
                              key={col.key}
                              className={[
                                'border-b border-surface-line align-middle text-ink-900',
                                col.mono ? 'tabular-nums' : '',
                                cellPad,
                                alignCls,
                              ].join(' ')}
                            >
                              {col.cell ? col.cell(value, row, idx) : value ?? <span className="text-ink-400">—</span>}
                            </td>
                          )
                        })}
                      </tr>
                      {renderExpanded && isExpanded && (
                        <tr>
                          <td
                            colSpan={columns.length + 1}
                            className="border-b border-surface-line bg-surface-50 px-6 py-4"
                          >
                            {renderExpanded(row)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
