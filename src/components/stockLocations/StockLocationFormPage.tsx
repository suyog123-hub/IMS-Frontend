import { useNavigate, useParams } from 'react-router-dom'
import { useCollection } from '../../hooks/useCollection'
import { stockLocationStorage } from '../../storage'
import type { LocationChannel } from '../../types/models'
import { toastError, toastSuccess } from '../../utils/toast'
import { StockLocationForm } from './StockLocationForm'

export function StockLocationFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const locations = useCollection(stockLocationStorage)

  const location = id ? locations.items.find((item) => item.id === id) : undefined

  const handleSubmit = (values: {
    name: string
    code: string
    parentId: string | null
    channel: LocationChannel
  }) => {
    if (location) {
      const updated = stockLocationStorage.update(location.id, values)
      if (!updated) {
        toastError('Could not update the stock location. Please try again.')
        return
      }
      toastSuccess('Stock location updated successfully.')
    } else {
      stockLocationStorage.create(values)
      toastSuccess('Stock location created successfully.')
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