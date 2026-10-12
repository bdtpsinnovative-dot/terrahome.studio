"use client"

import { usePathname } from "next/navigation"
import MessengerInquiryButton from "./MessengerInquiryButton"

function isProductDetailPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean)
  if (segments[0] === "prop" && segments.length >= 3) return true
  if (segments[0] === "collections" && segments.length >= 3) return true
  return false
}

export default function GlobalMessengerInquiryButton() {
  const pathname = usePathname()

  // Product detail already renders this button with the current product name.
  if (isProductDetailPath(pathname)) return null

  return <MessengerInquiryButton productName="" />
}
