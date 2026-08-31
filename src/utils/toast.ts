export type ToastKind = 'success' | 'error'

export interface ToastItem {
  readonly id: number
  readonly kind: ToastKind
  readonly message: string
}

type Listener = (snapshot: ToastItem[]) => void

let queue: ToastItem[] = []
let nextId = 0
const listeners = new Set<Listener>()

function emit(): void {
  const snapshot = queue.slice()
  for (const listener of listeners) listener(snapshot)
}

function addToast(kind: ToastKind, message: string): void {
  const toast: ToastItem = { id: ++nextId, kind, message }
  queue = [...queue, toast]
  emit()
  window.setTimeout(() => dismissToast(toast.id), 4000)
}

export function toastSuccess(message: string): void {
  addToast('success', message)
}

export function toastError(message: string): void {
  addToast('error', message)
}

export function dismissToast(id: number): void {
  queue = queue.filter((toast) => toast.id !== id)
  emit()
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToastsSnapshot(): ToastItem[] {
  return queue.slice()
}