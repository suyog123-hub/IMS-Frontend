import { useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../../hooks/useCollection'
import { stockLocationStorage } from '../../storage'
import { StockLocationForm } from './StockLocationForm'

export function StockLocationFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const locations = useCollection(stockLocationStorage)

  const location = id ? locations.items.find((item) => item.id === id) : undefined

  const handleSubmit = (values: { name: string; code: string; parentId: string | null }) => {
    if (location) {
      stockLocationStorage.update(location.id, values)
    } else {
      stockLocationStorage.create(values)
    }
    navigate('/stock-locations')
  }

  return (
    <section>
      <div className="page-header">
        <h1>{location ? 'Edit Stock Location' : 'Add Stock Location'}</h1>
        <p>Set up warehouses and sub-locations where stock can be stored.</p>
      </div>

      <StockLocationForm
        key={location?.id ?? 'new-location'}
        initial={location ?? null}
        locations={locations.items}
        onCancel={() => navigate('/stock-locations')}
        onSubmit={handleSubmit}
      />
    </section>
  )
}