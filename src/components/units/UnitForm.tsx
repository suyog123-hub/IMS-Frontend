import { useState, type FormEvent } from 'react'
import type { Unit } from '../../types/models'
import { validateName } from '../../utils/validation'
import { Field } from '../common/Field'

interface UnitFormProps {
  initial: Unit | null
  takenNames: string[]
  onCancel: () => void
  onSubmit: (name: string) => void
}

export function UnitForm({ initial, takenNames, onCancel, onSubmit }: UnitFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    const validationError = validateName(trimmed)
    if (validationError) {
      setError(validationError)
      return
    }
    const normalized = trimmed.toLowerCase()
    const isDuplicate = takenNames.some(
      (existing) => existing.toLowerCase() === normalized && existing.toLowerCase() !== initial?.name.toLowerCase(),
    )
    if (isDuplicate) {
      setError('A unit with this name already exists.')
      return
    }
    onSubmit(trimmed)
  }

  return (
    <div className="card">
      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field label="Name" error={error ?? undefined}>
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError(null)
            }}
            placeholder="e.g. Piece, Kg, Liter"
            className="input"
          />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {initial ? 'Update Unit' : 'Save Unit'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}