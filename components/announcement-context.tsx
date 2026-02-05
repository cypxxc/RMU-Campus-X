"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type AnnouncementContextValue = {
  hasAnnouncementVisible: boolean
  setHasAnnouncementVisible: (visible: boolean) => void
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null)

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [hasAnnouncementVisible, setHasAnnouncementVisible] = useState(false)
  return (
    <AnnouncementContext.Provider value={{ hasAnnouncementVisible, setHasAnnouncementVisible }}>
      {children}
    </AnnouncementContext.Provider>
  )
}

export function useAnnouncement() {
  const ctx = useContext(AnnouncementContext)
  return ctx ?? { hasAnnouncementVisible: false, setHasAnnouncementVisible: () => {} }
}
