export type Opportunity = {
  id: string
  name: string
  url: string
  type: "Accelerator" | "Grant" | "Fellowship" | "Incubator" | "Competition" | "Other"
  stage: "Idea" | "MVP" | "Revenue" | "Any" | "Unknown" | (string & {})
  geography: string
  equity: string
  domain: string
  deadline: string
  funding_amount: string
  description: string
  source: string
  added_at: string
  legitimacy_score: number
  [key: string]: unknown
}

// Google Sheets public JSON export URL
// Format: https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:json&sheet=approved
// Make the sheet publicly readable (Viewer access) — no API key needed
const SHEET_ID = process.env.NEXT_PUBLIC_SHEET_ID ?? ""
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=approved`

export async function fetchOpportunities(): Promise<Opportunity[]> {
  if (!SHEET_ID) {
    console.warn("NEXT_PUBLIC_SHEET_ID not set — returning empty list")
    return []
  }

  const res = await fetch(SHEET_URL, { next: { revalidate: 3600 } }) // cache 1h
  const text = await res.text()

  // Google wraps the JSON in  /*O_o*/\ngoogle.visualization.Query.setResponse(...)
  const jsonStr = text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "")
  const data = JSON.parse(jsonStr)

  const cols: string[] = data.table.cols.map((c: { label: string }) => c.label.toLowerCase())

  return (data.table.rows ?? []).map((row: { c: Array<{ v: unknown } | null> }) => {
    const obj: Record<string, string> = {}
    row.c.forEach((cell, i) => {
      obj[cols[i]] = cell?.v != null ? String(cell.v) : ""
    })
    return obj as unknown as Opportunity
  })
}

export const TYPES = ["All", "Accelerator", "Grant", "Fellowship", "Incubator", "Competition", "Other"]
export const STAGES = ["All", "Idea", "MVP", "Revenue", "Any"]
export const DOMAINS = ["All", "AI", "Climate", "HealthTech", "FinTech", "EdTech", "Web3", "DeepTech", "Social Impact", "Hardware", "Any"]
export const GEOGRAPHIES = ["All", "Global", "USA", "Europe", "India", "Africa", "Asia", "Latin America", "Middle East", "UK", "Canada", "Australia"]
export const EQUITY_TYPES = ["All", "Non-dilutive", "Dilutive", "Unknown"]
