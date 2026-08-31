import type { CSSProperties, ReactNode } from 'react'

export interface QuickFilterOption {
  value: string
  label: string
  color?: string
}

export interface QuickFilterGroup {
  label: string
  kind?: 'category' | 'tag' | 'status' | 'type' | 'location' | 'level'
  value: string
  options: QuickFilterOption[]
  onChange: (value: string) => void
}

interface QuickFilterPanelProps {
  groups: QuickFilterGroup[]
  onReset: () => void
  children?: ReactNode
}

const GROUP_ICONS: Record<string, ReactNode> = {
  category: (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 9 5-9 5-9-5Z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  ),
  tag: (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.6 13.4 11 3H3v8l10.4 10.6a2 2 0 0 0 2.8 0l4.4-4.4a2 2 0 0 0 0-2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  ),
  status: (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  type: (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M17 7H9" />
      <path d="M17 7v8" />
    </svg>
  ),
  location: (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  level: (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  ),
}

export function QuickFilterPanel({ groups, onReset, children }: QuickFilterPanelProps) {
  return (
    <aside className="card filter-panel">
      <div className="filter-panel-head">
        <h3 className="filter-panel-title">
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 3H2l8 9.46V19l4 2v-8.54Z" />
          </svg>
          Quick Filters
        </h3>
        <button type="button" className="filter-reset" onClick={onReset}>
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          Reset
        </button>
      </div>

      {groups.map((group) => (
        <div className="filter-group" key={group.label}>
          <label>{group.kind ? GROUP_ICONS[group.kind] : null}{group.label}</label>
          <div className="filter-chips" role="group" aria-label={`Filter by ${group.label}`}>
            {group.options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`chip-btn${group.value === option.value ? ' chip-btn-active' : ''}`}
                style={
                  group.value === option.value && option.color
                    ? ({ '--chip-btn-color': option.color } as CSSProperties)
                    : undefined
                }
                onClick={() => group.onChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {children}
    </aside>
  )
}