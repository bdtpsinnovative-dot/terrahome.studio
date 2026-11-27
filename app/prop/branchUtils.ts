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

export function getBranchType(branchName: string): "showroom" | "warehouse" | "event" {
  const lower = (branchName || "").toLowerCase()
  if (lower.includes("warehouse") || lower.includes("คลัง")) return "warehouse"
  if (lower.includes("event") || lower.includes("find")) return "event"
  return "showroom"
}

export function getBranchTypeLabel(branchName: string): string {
  const type = getBranchType(branchName)
  if (type === "warehouse") return "WAREHOUSE"
  if (type === "event") return "SPECIAL EVENT"
  return "SHOWROOM"
}

export function getBranchLocationHint(branchName: string): string {
  return ""
}
