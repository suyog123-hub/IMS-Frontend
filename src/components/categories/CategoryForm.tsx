import { useState, type FormEvent } from 'react'
import type { Category } from '../../types/models'
import { validateName } from '../../utils/validation'
import { toastError } from '../../utils/toast'
import { Field } from '../common/Field'

interface CategoryFormProps {
  initial: Category | null
  onCancel: () => void
  onSubmit: (name: string) => void
}

export function CategoryForm({ initial, onCancel, onSubmit }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const validationError = validateName(name)
    if (validationError) {
      setError(validationError)
      toastError('Please fix the highlighted field before saving.')
      return
    }
    onSubmit(name.trim())
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
            placeholder="e.g. Electronics, Food, Clothing"
            className="input"
          />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {initial ? 'Update Category' : 'Save Category'}
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}