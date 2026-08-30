interface ListFilterOption {
  value: string
  label: string
}

interface ListFilter {
  value: string
  onChange: (value: string) => void
  options: ListFilterOption[]
}

interface ListToolbarProps {
  query: string
  onQueryChange: (value: string) => void
  placeholder?: string
  filters?: ListFilter[]
}

export function ListToolbar({
  query,
  onQueryChange,
  placeholder = 'Search…',
  filters,
}: ListToolbarProps) {
  return (
    <div className="movement-filters">
      <input
        type="text"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        className="input inventory-search"
      />
      {filters?.map((filter, index) => (
        <select
          key={index}
          value={filter.value}
          onChange={(event) => filter.onChange(event.target.value)}
          className="input movement-filter-select"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}