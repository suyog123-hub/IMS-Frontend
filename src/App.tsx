import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { ProductsPage } from './components/products/ProductsPage'
import { ProductFormPage } from './components/products/ProductFormPage'
import { ProductVariantsPage } from './components/products/ProductVariantsPage'
import { CategoriesPage } from './components/categories/CategoriesPage'
import { CategoryFormPage } from './components/categories/CategoryFormPage'
import { UnitsPage } from './components/units/UnitsPage'
import { UnitFormPage } from './components/units/UnitFormPage'
import { StockLocationsPage } from './components/stockLocations/StockLocationsPage'
import { StockLocationFormPage } from './components/stockLocations/StockLocationFormPage'
import { InventoryPage } from './components/inventory/InventoryPage'
import { TransfersPage } from './components/transfers/TransfersPage'
import { SalesPage } from './components/sales/SalesPage'
import { ReturnsPage } from './components/returns/ReturnsPage'
import { MovementsPage } from './components/movements/MovementsPage'

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage key="new" />} />
          <Route path="/products/:id/edit" element={<ProductFormPage key="edit" />} />
          <Route path="/variant" element={<ProductVariantsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/new" element={<CategoryFormPage key="new" />} />
          <Route path="/categories/:id/edit" element={<CategoryFormPage key="edit" />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/units/new" element={<UnitFormPage key="new" />} />
          <Route path="/units/:id/edit" element={<UnitFormPage key="edit" />} />
          <Route path="/stock-locations" element={<StockLocationsPage />} />
          <Route path="/stock-locations/new" element={<StockLocationFormPage key="new" />} />
          <Route path="/stock-locations/:id/edit" element={<StockLocationFormPage key="edit" />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/transfers" element={<TransfersPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/movements" element={<MovementsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}

export default App