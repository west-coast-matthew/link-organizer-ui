/**
 * Chooses the backend the app talks to.
 *
 * - VITE_API_BASE_URL set (e.g. http://127.0.0.1:3000): real calls to that API.
 * - Not set or empty: the mock service, backed by the JSON files in mock-data/.
 *
 * Vite reads it from .env, .env.local or the shell when the dev server starts or the
 * app is built, so restart `npm run dev` after changing it.
 */
import type { LinkManagementApi } from './contract'
import { HttpLinkManagementService } from './link-mgmnt-http'
import { LinkManagementService } from './link-mgmnt-services'

const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiMode: 'http' | 'mock' = baseUrl ? 'http' : 'mock'

function createService(): LinkManagementApi {
  if (baseUrl) {
    if (import.meta.env.DEV) console.info(`[api] using ${baseUrl}`)
    return new HttpLinkManagementService(baseUrl)
  }
  const mock = new LinkManagementService()
  if (import.meta.env.DEV) {
    console.info('[api] VITE_API_BASE_URL is not set; using the mock API from mock-data/')
    // Exposed for poking at from the console, e.g. mockApi.configure({ errorRate: 1 }).
    ;(window as unknown as { mockApi: LinkManagementService }).mockApi = mock
  }
  return mock
}

/** The app-wide service instance. */
export const linkMgmtService: LinkManagementApi = createService()
