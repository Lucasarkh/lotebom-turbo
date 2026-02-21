import { toast, type ToastOptions } from 'vue3-toastify'

export function useToast() {
  const success = (msg: string, opts?: ToastOptions) =>
    toast.success(msg, { autoClose: 3000, ...opts })

  const error = (msg: string, opts?: ToastOptions) =>
    toast.error(msg, { autoClose: 5000, ...opts })

  const info = (msg: string, opts?: ToastOptions) =>
    toast.info(msg, { autoClose: 3000, ...opts })

  const warn = (msg: string, opts?: ToastOptions) =>
    toast.warning(msg, { autoClose: 4000, ...opts })

  /** Show toast.error with a user-friendly message extracted from an error object */
  const fromError = (e: unknown, fallback = 'Ocorreu um erro inesperado') => {
    let message = fallback
    if (e && typeof e === 'object' && 'message' in e) {
      message = (e as { message: string }).message || fallback
    }
    return error(message)
  }

  return { success, error, info, warn, fromError }
}
