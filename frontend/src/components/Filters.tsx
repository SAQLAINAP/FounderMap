"use client"

import { TYPES, STAGES, DOMAINS, GEOGRAPHIES, EQUITY_TYPES } from "@/lib/sheets"

export type FilterState = {
  search: string
  type: string
  stage: string
  domain: string
  geography: string
  equity: string
  sort: "popularity" | "funding" | "deadline" | "added" | "name"
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  type: "All",
  stage: "All",
  domain: "All",
  geography: "All",
  equity: "All",
  sort: "popularity",
}

type Props = {
  filters: FilterState
  onChange: (f: FilterState) => void
  total: number
  filtered: number
}

function Select({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o} value={o}>{o === "All" ? `${label}: All` : o}</option>
      ))}
    </select>
  )
}

const TYPE_TABS = ["All", "Accelerator", "Grant", "Fellowship", "Incubator", "Competition"]
const TAB_COLORS: Record<string, string> = {
  All: "bg-gray-900 text-white",
  Accelerator: "bg-blue-600 text-white",
  Grant: "bg-green-600 text-white",
  Fellowship: "bg-purple-600 text-white",
  Incubator: "bg-orange-500 text-white",
  Competition: "bg-yellow-500 text-white",
}
const TAB_INACTIVE: Record<string, string> = {
  All: "text-gray-600 hover:bg-gray-100",
  Accelerator: "text-blue-700 hover:bg-blue-50",
  Grant: "text-green-700 hover:bg-green-50",
  Fellowship: "text-purple-700 hover:bg-purple-50",
  Incubator: "text-orange-600 hover:bg-orange-50",
  Competition: "text-yellow-700 hover:bg-yellow-50",
}

export default function Filters({ filters, onChange, total, filtered }: Props) {
  const set = (key: keyof FilterState) => (value: string) =>
    onChange({ ...filters, [key]: value })

  const isFiltered =
    filters.search || filters.type !== "All" || filters.stage !== "All" ||
    filters.domain !== "All" || filters.geography !== "All" || filters.equity !== "All"

  return (
    <div className="flex flex-col gap-4">
      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => {
          const active = filters.type === tab
          return (
            <button
              key={tab}
              onClick={() => set("type")(tab)}
              className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors border ${
                active
                  ? `${TAB_COLORS[tab]} border-transparent`
                  : `border-gray-200 bg-white ${TAB_INACTIVE[tab]}`
              }`}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Search + dropdowns */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search programs, keywords, locations..."
          value={filters.search}
          onChange={(e) => set("search")(e.target.value)}
          className="flex-1 min-w-[200px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <Select label="Stage" value={filters.stage} options={STAGES} onChange={set("stage")} />
        <Select label="Domain" value={filters.domain} options={DOMAINS} onChange={set("domain")} />
        <Select label="Geography" value={filters.geography} options={GEOGRAPHIES} onChange={set("geography")} />
        <Select label="Equity" value={filters.equity} options={EQUITY_TYPES} onChange={set("equity")} />
        <Select
          label="Sort"
          value={filters.sort}
          options={["popularity", "funding", "deadline", "added", "name"]}
          onChange={(v) => onChange({ ...filters, sort: v as FilterState["sort"] })}
        />
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-800">{filtered}</span> of {total} programs
        {isFiltered && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-2 underline hover:text-gray-800"
          >
            Clear all filters
          </button>
        )}
      </p>
    </div>
  )
}
