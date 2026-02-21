/**
 * Public API composable — no auth headers, for /p/ routes.
 */
export const usePublicApi = () => {
  const config = useRuntimeConfig()
  const baseUrl = `${config.public.apiBase}/api`

  const fetchPublic = async (url: string, options: any = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers }
    const res = await fetch(`${baseUrl}${url}`, { ...options, headers })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro na requisição' }))
      throw new Error(err.message || `Erro ${res.status}`)
    }
    const txt = await res.text()
    return txt ? JSON.parse(txt) : null
  }

  return { fetchPublic }
}
