'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface TopbarCtx {
  breadcrumb: ReactNode
  setBreadcrumb: (node: ReactNode) => void
  onRefresh: (() => void) | null
  setOnRefresh: (fn: (() => void) | null) => void
}

const Ctx = createContext<TopbarCtx | null>(null)

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumb] = useState<ReactNode>(null)
  const [onRefresh, setOnRefreshState] = useState<(() => void) | null>(null)

  const setOnRefresh = useCallback((fn: (() => void) | null) => {
    // useState setter với function argument bị nhầm thành updater — wrap lại
    setOnRefreshState(() => fn)
  }, [])

  return (
    <Ctx.Provider value={{ breadcrumb, setBreadcrumb, onRefresh, setOnRefresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTopbar() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTopbar must be used within TopbarProvider')
  return ctx
}
