let maintenanceCache: { enabled: boolean; checkedAt: number } | null = null
const CACHE_TTL = 30000 // 30 seconds

export default defineNuxtRouteMiddleware(async (to) => {
  const isPainel = to.path.startsWith('/painel')
  const isLogin = to.path === '/login'
  const isMaintenancePage = to.path === '/manutencao'

  // Don't block panel or login routes — sysadmin needs access
  if (isPainel || isLogin) return

  // Use cache to avoid hitting the endpoint on every navigation
  const now = Date.now()
  if (maintenanceCache && (now - maintenanceCache.checkedAt) < CACHE_TTL) {
    if (maintenanceCache.enabled && !isMaintenancePage) {
      return navigateTo('/manutencao')
    }
    if (!maintenanceCache.enabled && isMaintenancePage) {
      return navigateTo('/')
    }
    return
  }

  try {
    const config = useRuntimeConfig()
    const apiBase = (config.public.apiBase || '').replace(/\/+$/, '')
    const baseUrl = `${apiBase}/api`
    const res = await fetch(`${baseUrl}/p/settings/maintenance`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (res.ok) {
      const data = await res.json()
      maintenanceCache = { enabled: !!data.enabled, checkedAt: now }

      if (data.enabled && !isMaintenancePage) {
        return navigateTo('/manutencao')
      }
      if (!data.enabled && isMaintenancePage) {
        return navigateTo('/')
      }
    }
  } catch {
    // If the check fails, don't block navigation
  }
})
