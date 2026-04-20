"use client"

import { useEffect, useState, useMemo } from "react"
import { fetchOpportunities, type Opportunity } from "@/lib/sheets"
import OpportunityCard from "@/components/OpportunityCard"
import Filters, { type FilterState, DEFAULT_FILTERS } from "@/components/Filters"

const SUBMIT_FORM_URL = process.env.NEXT_PUBLIC_SUBMIT_FORM_URL ?? "#"

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

export default function HomePage() {
  const [all, setAll] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  useEffect(() => {
    fetchOpportunities()
      .then(setAll)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = all

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (o) =>
          (o.name         ?? "").toLowerCase().includes(q) ||
          (o.description  ?? "").toLowerCase().includes(q) ||
          (o.geography    ?? "").toLowerCase().includes(q) ||
          (o.domain       ?? "").toLowerCase().includes(q),
      )
    }

    if (filters.type !== "All") {
      result = result.filter((o) => o.type === filters.type)
    }

    if (filters.stage !== "All") {
      result = result.filter((o) => o.stage === filters.stage || o.stage === "Any")
    }

    if (filters.domain !== "All") {
      result = result.filter((o) => {
        const d = (o.domain ?? "").toLowerCase()
        return d.includes(filters.domain.toLowerCase()) || d === "any"
      })
    }

    if (filters.geography !== "All") {
      result = result.filter((o) => {
        const g = (o.geography ?? "").toLowerCase()
        return g.includes(filters.geography.toLowerCase()) || g === "global"
      })
    }

    if (filters.equity !== "All") {
      if (filters.equity === "Dilutive") {
        result = result.filter((o) => (o.equity ?? "").toLowerCase().includes("equity") || (o.equity ?? "").includes("%"))
      } else if (filters.equity === "Non-dilutive") {
        result = result.filter((o) => (o.equity ?? "").toLowerCase().includes("non-dilutive"))
      } else if (filters.equity === "Unknown") {
        result = result.filter((o) => (o.equity ?? "").toLowerCase() === "unknown")
      }
    }

    const parseFunding = (s: string) => {
      if (!s || s === "Unknown") return -1
      const n = parseFloat(s.replace(/[^0-9.]/g, ""))
      return isNaN(n) ? -1 : n
    }
    const parseDeadline = (d: string) => {
      if (!d || d === "Unknown" || d === "Rolling") return Infinity
      const t = new Date(d).getTime()
      return isNaN(t) ? Infinity : t
    }

    return result.slice().sort((a, b) => {
      if (filters.sort === "popularity") return (b.legitimacy_score ?? 0) - (a.legitimacy_score ?? 0)
      if (filters.sort === "funding")    return parseFunding(b.funding_amount) - parseFunding(a.funding_amount)
      if (filters.sort === "name")       return a.name.localeCompare(b.name)
      if (filters.sort === "added")      return b.added_at.localeCompare(a.added_at)
      return parseDeadline(a.deadline) - parseDeadline(b.deadline)
    })
  }, [all, filters])

  // Stats derived from full dataset
  const stats = useMemo(() => ({
    total: all.length,
    accelerators: all.filter((o) => o.type === "Accelerator").length,
    grants: all.filter((o) => o.type === "Grant").length,
    fellowships: all.filter((o) => o.type === "Fellowship").length,
    nonDilutive: all.filter((o) => (o.equity ?? "").toLowerCase().includes("non-dilutive")).length,
  }), [all])

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">FounderMap</h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Every accelerator, grant, fellowship &amp; incubator. Free. Open-source.
            </p>
          </div>
          <a
            href={SUBMIT_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            + Submit a program
          </a>
        </div>
      </div>

      {/* Hero stats */}
      {!loading && all.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap justify-center gap-8">
            <StatBadge label="Total Programs" value={stats.total} />
            <StatBadge label="Accelerators" value={stats.accelerators} />
            <StatBadge label="Grants" value={stats.grants} />
            <StatBadge label="Fellowships" value={stats.fellowships} />
            <StatBadge label="Non-dilutive" value={stats.nonDilutive} />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Filters */}
        <Filters
          filters={filters}
          onChange={setFilters}
          total={all.length}
          filtered={filtered.length}
        />

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">No programs found</p>
            <p className="text-sm mt-1">
              Try adjusting your filters or{" "}
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="underline">
                clear all
              </button>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((op) => (
              <OpportunityCard key={op.id || op.url} op={op} />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-8 border-t border-gray-100 mt-4">
          <p>Open-source community project. Data updated every 12 hours automatically.</p>
          <p className="mt-1">
            <a
              href="https://github.com/yourusername/foundermap"
              className="underline hover:text-gray-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {" · "}
            <a href={SUBMIT_FORM_URL} className="underline hover:text-gray-600" target="_blank" rel="noopener noreferrer">
              Submit a program
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
