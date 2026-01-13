"use client"

import dynamic from "next/dynamic"

// Lazy load HelpBotWidget - not needed on initial render
const HelpBotWidget = dynamic(
  () => import("@/components/help-bot/chat-widget").then(mod => ({ default: mod.HelpBotWidget })),
  { ssr: false }
)

export function LazyHelpBot() {
  return <HelpBotWidget />
}
