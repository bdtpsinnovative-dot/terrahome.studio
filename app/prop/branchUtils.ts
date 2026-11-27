export interface Branch {
  id: string | number
  branch_code: string
  branch_name: string
  latitude?: number
  longitude?: number
}

export function getCleanBranchName(name: string): string {
  if (!name) return "All Locations"
  return name.trim()
}

export function getMapPinBranchName(name: string): string {
  if (!name) return ""
  return name.trim()
}

export function getBranchType(branchName: string, branchCode?: string): "showroom" | "warehouse" | "event" {
  const lowerName = (branchName || "").toLowerCase()
  const lowerCode = (branchCode || "").toLowerCase()

  if (lowerName.includes("warehouse") || lowerName.includes("คลัง") || lowerCode.startsWith("wh")) {
    return "warehouse"
  }
  if (
    lowerName.includes("event") ||
    lowerName.includes("find") ||
    lowerName.includes("cdc") ||
    lowerCode.includes("event") ||
    lowerCode.includes("cdc")
  ) {
    return "event"
  }
  return "showroom"
}

export function getBranchTypeLabel(branchName: string, branchCode?: string): string {
  const type = getBranchType(branchName, branchCode)
  if (type === "warehouse") return "WAREHOUSE"
  if (type === "event") return "SPECIAL EVENT"
  return "SHOWROOM"
}

export function getBranchLocationHint(branchName: string): string {
  return ""
}
