import { useEffect, useState } from 'react'
import {
  dismissToast,
  getToastsSnapshot,
  subscribeToasts,
  type ToastItem,
} from '../../utils/toast'

const ToastIcon = ({ kind }: { kind: ToastItem['kind'] }) => (
  <span className="toast-icon" aria-hidden="true">
    {kind === 'success' ? (
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    )}
  </span>
)

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>(() => getToastsSnapshot())

  useEffect(() => subscribeToasts((snapshot) => setToasts(snapshot)), [])

  if (toasts.length === 0) return null

  return (
    <div className="toaster" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <ToastIcon kind={toast.kind} />
          <span className="toast-message">{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}