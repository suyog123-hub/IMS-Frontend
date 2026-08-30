import { useNavigate, useParams } from 'react-router-dom'
import { unitStorage } from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { UnitForm } from './UnitForm'

export function UnitFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const units = useCollection(unitStorage)

  const unit = id ? units.items.find((item) => item.id === id) : undefined

  const handleSubmit = (name: string) => {
    if (unit) {
      unitStorage.update(unit.id, { name })
    } else {
      unitStorage.create({ name })
    }
    navigate('/units')
  }

  return (
    <section>
      <div className="page-header">
        <h1>{unit ? 'Edit Unit' : 'Add Unit'}</h1>
        <p>Units are used to measure product quantities.</p>
      </div>

      <UnitForm
        key={unit?.id ?? 'new-unit'}
        initial={unit ?? null}
        takenNames={units.items.map((existing) => existing.name)}
        onCancel={() => navigate('/units')}
        onSubmit={handleSubmit}
      />
    </section>
  )
}