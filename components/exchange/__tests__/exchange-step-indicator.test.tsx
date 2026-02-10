import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ExchangeStepIndicator } from "@/components/exchange/exchange-step-indicator"
import type { ExchangeStatus } from "@/types"

function renderIndicator(
  status: ExchangeStatus,
  ownerConfirmed = false,
  requesterConfirmed = false
) {
  return render(
    <ExchangeStepIndicator
      status={status}
      ownerConfirmed={ownerConfirmed}
      requesterConfirmed={requesterConfirmed}
    />
  )
}

function getCheckCount(container: HTMLElement) {
  return container.querySelectorAll("svg.lucide-check").length
}

describe("ExchangeStepIndicator", () => {
  it("renders pending with no completed checkmarks", () => {
    const { container } = renderIndicator("pending")
    expect(getCheckCount(container)).toBe(0)
  })

  it("renders in_progress with first step completed", () => {
    const { container } = renderIndicator("in_progress")
    expect(getCheckCount(container)).toBe(1)
  })

  it("maps legacy accepted to in_progress visuals", () => {
    const { container } = renderIndicator("accepted")
    expect(getCheckCount(container)).toBe(1)
  })

  it("renders completed with all steps checked", () => {
    const { container } = renderIndicator("completed", true, true)
    expect(getCheckCount(container)).toBe(3)
  })

  it("shows waiting message while in_progress and one side confirmed", () => {
    renderIndicator("in_progress", true, false)
    expect(screen.getByText("รออีกฝ่ายยืนยัน")).toBeInTheDocument()
  })

  it("hides waiting message when completed", () => {
    renderIndicator("completed", true, false)
    expect(screen.queryByText("รออีกฝ่ายยืนยัน")).not.toBeInTheDocument()
  })
})

