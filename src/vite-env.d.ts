/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Shortest emulated API delay in ms (default 3000). */
  readonly VITE_MOCK_MIN_DELAY_MS?: string
  /** Longest emulated API delay in ms (default 6000). */
  readonly VITE_MOCK_MAX_DELAY_MS?: string
  /** 0–1 chance that an emulated call fails with a transient server error (default 0.1). */
  readonly VITE_MOCK_ERROR_RATE?: string
}
