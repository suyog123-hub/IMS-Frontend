import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const round2 = (value: number) => Math.round(value * 100) / 100

interface Range {
  min: number
  max: number
}

interface PriceRangeFilterProps {
  appliedMin: string
  appliedMax: string
  maxValue: number
  totalCount: number
  countInRange: (min: number, max: number) => number
  onApply: (min: string, max: string) => void
  onClear: () => void
}

function normalizeRange(appliedMin: string, appliedMax: string, maxValue: number): Range {
  const parsedMin = Number(appliedMin.trim())
  const parsedMax = Number(appliedMax.trim())
  const min = appliedMin.trim() !== '' && Number.isFinite(parsedMin) ? parsedMin : 0
  const max = appliedMax.trim() !== '' && Number.isFinite(parsedMax) ? parsedMax : maxValue
  return { min: clamp(min, 0, maxValue), max: clamp(Math.max(max, 0), 0, maxValue) }
}

function formatRange(range: Range, maxValue: number): [string, string] {
  const min = range.min <= 0 ? '' : String(round2(range.min))
  const max = range.max >= maxValue ? '' : String(round2(range.max))
  return [min, max]
}

export function PriceRangeFilter({
  appliedMin,
  appliedMax,
  maxValue,
  totalCount,
  countInRange,
  onApply,
  onClear,
}: PriceRangeFilterProps) {
  const [draft, setDraft] = useState<Range>(() => normalizeRange(appliedMin, appliedMax, maxValue))
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)
  const [minText, setMinText] = useState<string | null>(null)
  const [maxText, setMaxText] = useState<string | null>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null)

  const trackRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef(draft)
  const dragKeyRef = useRef<'min' | 'max' | null>(null)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const appliedKey = `${appliedMin}|${appliedMax}|${maxValue}`
  const [syncedKey, setSyncedKey] = useState(appliedKey)
  if (appliedKey !== syncedKey) {
    setSyncedKey(appliedKey)
    setDraft(normalizeRange(appliedMin, appliedMax, maxValue))
    setMinText(null)
    setMaxText(null)
  }

  const applied = useMemo(
    () => normalizeRange(appliedMin, appliedMax, maxValue),
    [appliedMin, appliedMax, maxValue]
  )
  const isClean = draft.min === applied.min && draft.max === applied.max
  const safeMax = Math.max(maxValue, 1)

  const pctOf = useCallback(
    (value: number) => (clamp(value, 0, maxValue) / safeMax) * 100,
    [maxValue, safeMax]
  )

  const matchCount = useMemo(() => {
    const lo = Math.min(draft.min, draft.max)
    const hi = Math.max(draft.min, draft.max)
    return countInRange(lo, hi)
  }, [countInRange, draft.min, draft.max])

  const valueFromX = useCallback(
    (clientX: number): number => {
      const el = trackRef.current
      if (!el) return 0
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return 0
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
      return Math.round(ratio * maxValue)
    },
    [maxValue]
  )

  const updateFromX = useCallback(
    (clientX: number, handle: 'min' | 'max') => {
      const value = valueFromX(clientX)
      setDraft((current) => {
        if (handle === 'min') return { min: Math.min(value, current.max), max: current.max }
        return { min: current.min, max: Math.max(value, current.min) }
      })
    },
    [valueFromX]
  )

  const startDrag =
    (handle: 'min' | 'max') => (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragKeyRef.current = handle
      setDragging(handle)
      updateFromX(event.clientX, handle)
    }

  const moveHandle = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragKeyRef.current) return
    updateFromX(event.clientX, dragKeyRef.current)
  }

  const endDrag = () => {
    dragKeyRef.current = null
    setDragging(null)
  }

  const handleTrackDown = (event: PointerEvent<HTMLDivElement>) => {
    if (dragKeyRef.current) return
    const value = valueFromX(event.clientX)
    const current = draftRef.current
    const nearMin = Math.abs(value - current.min) <= Math.abs(current.max - value)
    const handle: 'min' | 'max' = nearMin ? 'min' : 'max'
    dragKeyRef.current = handle
    setDragging(handle)
    setDraft(
      nearMin
        ? { min: Math.min(value, current.max), max: current.max }
        : { min: current.min, max: Math.max(value, current.min) }
    )
  }

  const applyRange = (range: Range) => {
    onApply(...formatRange(range, maxValue))
  }

  const handleApply = () => {
    applyRange(draft)
  }

  const handleApplyClick = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setRipple({ x: event.clientX - rect.left, y: event.clientY - rect.top, key: Date.now() })
    handleApply()
  }

  const handleClear = () => {
    const empty = { min: 0, max: maxValue }
    setDraft(empty)
    setMinText(null)
    setMaxText(null)
    onClear()
  }

  const onMinTextChange = (text: string) => {
    if (!/^\d*\.?\d*$/.test(text)) return
    setMinText(text)
    const num = text === '' ? 0 : Number(text)
    setDraft((current) => ({ min: clamp(num, 0, Math.min(current.max, maxValue)), max: current.max }))
  }

  const onMaxTextChange = (text: string) => {
    if (!/^\d*\.?\d*$/.test(text)) return
    setMaxText(text)
    const num = text === '' ? 0 : Number(text)
    setDraft((current) => ({ min: current.min, max: clamp(num, current.min, maxValue) }))
  }

  const pctMin = pctOf(draft.min)
  const pctMax = pctOf(draft.max)
  const minDisplay = minText ?? String(round2(draft.min))
  const maxDisplay = maxText ?? String(round2(draft.max))
  const isDraggingMin = dragging === 'min'
  const isDraggingMax = dragging === 'max'

  return (
    <div className="prf">
      <div className="prf-head">
        <span className="prf-title">Price Range</span>
        <span className={matchCount > 0 ? 'prf-badge' : 'prf-badge prf-badge-zero'}>
          {matchCount} in range
        </span>
      </div>

      <div className="prf-slider-area">
        <div className="prf-track" ref={trackRef} onPointerDown={handleTrackDown}>
          <div
            className="prf-range"
            style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }}
          />
          <button
            type="button"
            className={`prf-handle${isDraggingMin ? ' prf-dragging' : ''}`}
            style={{ left: `calc(${pctMin}% - 9px)` }}
            data-value={`$${minDisplay}`}
            aria-label="Minimum price"
            onPointerDown={startDrag('min')}
            onPointerMove={moveHandle}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
          <button
            type="button"
            className={`prf-handle${isDraggingMax ? ' prf-dragging' : ''}`}
            style={{ left: `calc(${pctMax}% - 9px)` }}
            data-value={`$${maxDisplay}`}
            aria-label="Maximum price"
            onPointerDown={startDrag('max')}
            onPointerMove={moveHandle}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          />
        </div>
        <div className="prf-scale">
          <span>$0</span>
          <span>${round2(maxValue)}</span>
        </div>
      </div>

      <div className="prf-inputs">
        <label className="prf-field">
          <span className="prf-label">Min Price</span>
          <div className="prf-input">
            <span className="prf-currency" aria-hidden="true">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={minDisplay}
              onFocus={() => setMinText(String(round2(draft.min)))}
              onChange={(event) => onMinTextChange(event.target.value)}
              onBlur={() => setMinText(null)}
            />
          </div>
        </label>

        <span className="prf-dash" aria-hidden="true">
          –
        </span>

        <label className="prf-field">
          <span className="prf-label">Max Price</span>
          <div className="prf-input">
            <span className="prf-currency" aria-hidden="true">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={maxDisplay}
              onFocus={() => setMaxText(String(round2(draft.max)))}
              onChange={(event) => onMaxTextChange(event.target.value)}
              onBlur={() => setMaxText(null)}
            />
          </div>
        </label>
      </div>

      <div className="prf-actions">
        <button type="button" className="prf-clear" onClick={handleClear}>
          Clear
        </button>
        <button
          type="button"
          className="prf-apply"
          disabled={isClean}
          onClick={handleApplyClick}
        >
          Apply Filter
          {ripple !== null && (
            <span
              key={ripple.key}
              className="prf-ripple"
              style={{ left: ripple.x, top: ripple.y }}
            />
          )}
        </button>
      </div>

      <p className="prf-note">
        Showing <strong>{matchCount}</strong> of {totalCount} products
      </p>
    </div>
  )
}