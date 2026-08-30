import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/categories', label: 'Categories' },
  { to: '/units', label: 'Units' },
  { to: '/products', label: 'Products' },
  { to: '/stock-locations', label: 'Stock Locations' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/transfers', label: 'Transfers' },
  { to: '/movements', label: 'Movements' },
]

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app">
      <div className="app-body">
        <aside className="app-sidebar">
          <NavLink to="/" className="brand">
            <span className="brand-logo">IMS</span>
            <span className="brand-name">Inventory Manager</span>
          </NavLink>
          <nav className="nav" aria-label="Main navigation">
            <span className="nav-label">Menu</span>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="app-main">
          <div className="container">{children}</div>
        </main>
      </div>
    </div>
  )
}