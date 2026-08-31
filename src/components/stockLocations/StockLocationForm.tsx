import { useState, type FormEvent } from 'react'
import type { LocationChannel, StockLocation } from '../../types/models'
import { CHANNEL_OPTIONS } from '../../utils/channels'
import {
  validateStockLocation,
  normalizeStockLocationCode,
  type StockLocationFormErrors,
} from '../../utils/validation'
import { toastError } from '../../utils/toast'
import { Field } from '../common/Field'

interface StockLocationValues {
  name: string
  code: string
  parentId: string | null
  channel: LocationChannel
}

interface StockLocationFormProps {
  initial: StockLocation | null
  locations: StockLocation[]
  onCancel: () => void
  onSubmit: (values: StockLocationValues) => void
}

function availableParents(locations: StockLocation[], selfId: string | null) {
  const available = locations
    .filter((location) => location.id !== selfId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const depthOf = new Map<string, number>()
  const visited = new Set<string>()
  const computeDepth = (location: StockLocation, depth: number): void => {
    if (visited.has(location.id)) return
    visited.add(location.id)
    depthOf.set(location.id, depth)
    for (const child of locations.filter(
      (candidate) => candidate.parentId === location.id
    )) {
      computeDepth(child, depth + 1)
    }
  }
  for (const location of locations.filter((item) => item.parentId === null)) {
    computeDepth(location, 0)
  }
  return { available, depthOf }
}

export function StockLocationForm({
  initial,
  locations,
  onCancel,
  onSubmit,
}: StockLocationFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [code, setCode] = useState(initial?.code ?? '')
  const [channel, setChannel] = useState<LocationChannel>(initial?.channel ?? 'warehouse')
  const [parentId, setParentId] = useState(initial?.parentId ?? '')
  const [errors, setErrors] = useState<StockLocationFormErrors>({})

  const selfId = initial?.id ?? null
  const { available, depthOf } = availableParents(locations, selfId)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateStockLocation(
      { name, code, parentId: parentId || '' },
      locations,
      selfId
    )
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      toastError('Please fix the highlighted fields before saving.')
      return
    }
    onSubmit({
      name: name.trim(),
      code: normalizeStockLocationCode(code),
      parentId: parentId || null,
      channel,
    })
  }

  return (
    <div className="card">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Name" error={errors.name} hint="e.g. Main Warehouse, Store 1, Backroom">
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setErrors((prev) => ({ ...prev, name: undefined }))
            }}
            placeholder="e.g. Backroom Shelf A"
            className="input"
          />
        </Field>

        <Field
          label="Code"
          error={errors.code}
          hint="A short unique identifier, e.g. MAIN, WH-01, ST-A"
        >
          <input
            type="text"
            value={code}
            onChange={(event) => {
              setCode(normalizeStockLocationCode(event.target.value))
              setErrors((prev) => ({ ...prev, code: undefined }))
            }}
            placeholder="e.g. BACK-A"
            className="input input-code"
          />
        </Field>

        <Field
          label="Channel"
          hint="which sales channel this location belongs to (used for the channel stock view)"
        >
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as LocationChannel)}
            className="input"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Parent Location" error={errors.parentId} hint="Optional. Create a hierarchy.">
          <select
            value={parentId}
            onChange={(event) => {
              setParentId(event.target.value)
              setErrors((prev) => ({ ...prev, parentId: undefined }))
            }}
            className="input"
          >
            <option value="">No parent (top level)</option>
            {available.map((location) => {
              const depth = depthOf.get(location.id) ?? 0
              return (
                <option key={location.id} value={location.id}>
                  {'\u00a0'.repeat(depth * 3)}
                  {location.name} ({location.code})
                </option>
              )
            })}
          </select>
        </Field>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {initial ? 'Update Location' : 'Save Location'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}