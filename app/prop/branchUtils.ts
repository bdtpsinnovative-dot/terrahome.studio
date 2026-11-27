export interface Branch {
  id: string | number
  branch_code: string
  branch_name: string
  latitude?: number
  longitude?: number
}

export function getCleanBranchName(name: string): string {
  if (!name) return "TERRA BRANCH"
  return name
    .replace(/^SHOWROOM\s+TERRA\s+/i, "")
    .replace(/^SHOWROOM\s+/i, "")
    .replace(/^EVENT\s+FIND\s+-\s+/i, "")
    .replace(/^WAREHOUSE\s+/i, "WH: ")
    .trim()
}

export function getMapPinBranchName(name: string): string {
  if (!name) return "TERRA"
  return name
    .replace(/^SHOWROOM\s+TERRA\s+/i, "")
    .replace(/^SHOWROOM\s+SESIA\s+/i, "")
    .replace(/^SHOWROOM\s+WOODEN\s+/i, "WOODEN ")
    .replace(/^SHOWROOM\s+/i, "")
    .replace(/^EVENT\s+FIND\s+-\s+(DESIGN\s+FAIR\s+)?/i, "FIND ")
    .replace(/^EVENT\s+/i, "")
    .replace(/^WAREHOUSE\s+/i, "WH: ")
    .trim()
}

export function getBranchType(branchName: string): "showroom" | "warehouse" | "event" {
  const lower = (branchName || "").toLowerCase()
  if (lower.includes("warehouse") || lower.includes("คลัง")) return "warehouse"
  if (lower.includes("event") || lower.includes("find")) return "event"
  return "showroom"
}

export function getBranchTypeLabel(branchName: string): string {
  const type = getBranchType(branchName)
  if (type === "warehouse") return "คลังสินค้า • WAREHOUSE"
  if (type === "event") return "อีเวนต์พิเศษ • EVENT"
  return "โชว์รูม • SHOWROOM"
}

export function getBranchLocationHint(branchName: string): string {
  const lower = (branchName || "").toLowerCase()
  if (lower.includes("sukhumvit")) return "สุขุมวิท 26 • กรุงเทพฯ"
  if (lower.includes("central world") || lower.includes("sesia")) return "เซ็นทรัลเวิลด์ • กรุงเทพฯ"
  if (lower.includes("pradit") || lower.includes("manutham")) return "เลียบด่วนรามอินทรา • กรุงเทพฯ"
  if (lower.includes("ladprao")) return "ลาดพร้าว • กรุงเทพฯ"
  if (lower.includes("kaset")) return "เกษตร-นวมินทร์ • กรุงเทพฯ"
  if (lower.includes("phuket")) return "เมืองภูเก็ต • ภาคใต้"
  if (lower.includes("ayutthaya")) return "พระนครศรีอยุธยา"
  if (lower.includes("nonthaburi")) return "บางบัวทอง • นนทบุรี"
  if (lower.includes("bangkok")) return "บางซื่อ • กรุงเทพฯ"
  if (lower.includes("find")) return "ศูนย์ฯ สิริกิติ์ • กรุงเทพฯ"
  return "กรุงเทพมหานคร"
}
