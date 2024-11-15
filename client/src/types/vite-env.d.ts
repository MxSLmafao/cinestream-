/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly TMDB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot: {
    readonly data: any
    accept(): void
    dispose(cb: (data: any) => void): void
    decline(): void
    invalidate(): void
    on(event: string, cb: (data: any) => void): void
  }
}
