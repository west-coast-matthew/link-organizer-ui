/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the real API, e.g. http://127.0.0.1:3000. When unset or empty, the app uses the mock API. */
  readonly VITE_API_BASE_URL?: string
  /** Shortest emulated API delay in ms (default 3000). */
  readonly VITE_MOCK_MIN_DELAY_MS?: string
  /** Longest emulated API delay in ms (default 6000). */
  readonly VITE_MOCK_MAX_DELAY_MS?: string
  /** 0–1 chance that an emulated call fails with a transient server error (default 0.1). */
  readonly VITE_MOCK_ERROR_RATE?: string
}
