import type { ReactElement, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Toaster } from '../common/Toaster'

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  to: string
  label: string
  icon: ReactElement
  end?: boolean
}

const icon = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
)

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    icon: icon(
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
  },
  {
    to: '/categories',
    label: 'Categories',
    icon: icon(
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    ),
  },
  {
    to: '/units',
    label: 'Units',
    icon: icon(<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />),
  },
  {
    to: '/products',
    label: 'Products',
    icon: icon(
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
  },
  {
    to: '/variant',
    label: 'Product Variants',
    icon: icon(
      <>
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 12 10 5 10-5" />
        <path d="m2 17 10 5 10-5" />
      </>
    ),
  },
  {
    to: '/stock-locations',
    label: 'Stock Locations',
    icon: icon(
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
  {
    to: '/inventory',
    label: 'Inventory',
    icon: icon(
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="M3.27 6.96 12 12l8.73-5.05" />
        <path d="M12 22V12" />
      </>
    ),
  },
  {
    to: '/transfers',
    label: 'Transfers',
    icon: icon(
      <>
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="M16 21l4-4-4-4" />
        <path d="M20 17H4" />
      </>
    ),
  },
  {
    to: '/sales',
    label: 'Sales',
    icon: icon(
      <>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6M16 12h-6M16 16h-6" />
      </>
    ),
  },
  {
    to: '/returns',
    label: 'Returns',
    icon: icon(
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
  },
  {
    to: '/movements',
    label: 'Movements',
    icon: icon(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />),
  },
]

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app">
      <div className="app-body">
        <aside className="app-sidebar">
          <NavLink to="/" className="brand">
            <span className="brand-logo">
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="M3.27 6.96 12 12l8.73-5.05" />
                <path d="M12 22V12" />
              </svg>
            </span>
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
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-note">
            <span className="sidebar-note-dot" />
            Data stored in your browser
          </div>
        </aside>
        <main className="app-main">
          <div className="container">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}