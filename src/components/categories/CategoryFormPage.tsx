import { useNavigate, useParams } from 'react-router-dom'
import { categoryStorage } from '../../storage'
import { useCollection } from '../../hooks/useCollection'
import { CategoryForm } from './CategoryForm'

export function CategoryFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const categories = useCollection(categoryStorage)

  const category = id ? categories.items.find((item) => item.id === id) : undefined

  const handleSubmit = (name: string) => {
    if (category) {
      categoryStorage.update(category.id, { name })
    } else {
      categoryStorage.create({ name })
    }
    navigate('/categories')
  }

  return (
    <section>
      <div className="page-header">
        <h1>{category ? 'Edit Category' : 'Add Category'}</h1>
        <p>Create and manage the categories used by your products.</p>
      </div>

      <CategoryForm
        key={category?.id ?? 'new-category'}
        initial={category ?? null}
        onCancel={() => navigate('/categories')}
        onSubmit={handleSubmit}
      />
    </section>
  )
}