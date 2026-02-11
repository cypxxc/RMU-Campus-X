import { describe, expect, it } from "vitest"
import {
  getItemPrimaryImageSrcSet,
  getItemPrimaryImageUrl,
  resolveImageUrl,
} from "@/lib/cloudinary-url"

describe("cloudinary-url", () => {
  it("passes through non-cloudinary absolute URLs", () => {
    const googleUrl = "https://lh3.googleusercontent.com/a/ACg8ocK123=s96-c"
    expect(resolveImageUrl(googleUrl)).toBe(googleUrl)
  })

  it("passes through local public asset paths", () => {
    expect(resolveImageUrl("/images/exchange.svg")).toBe("/images/exchange.svg")
  })

  it("injects auto optimization for legacy Cloudinary delivery URLs", () => {
    const input = "https://res.cloudinary.com/demo/image/upload/rmu-exchange/items/abc123.webp"
    expect(resolveImageUrl(input)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/rmu-exchange/items/abc123.webp"
    )
  })

  it("does not transform absolute URL values in imagePublicIds", () => {
    const external = "https://example.com/images/1.jpg"
    expect(getItemPrimaryImageUrl({ imagePublicIds: [external] })).toBe(external)
    expect(getItemPrimaryImageSrcSet({ imagePublicIds: [external] })).toBeUndefined()
  })
})
