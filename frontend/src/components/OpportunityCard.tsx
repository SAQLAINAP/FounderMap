import type { Opportunity } from "@/lib/sheets"

// Custom featured tile styles for well-known programs
const FEATURED: Record<string, { card: string; badge: string; text: string; subtext: string; label?: string }> = {
  "Y Combinator":               { card: "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400", badge: "bg-orange-700 text-orange-100", text: "text-white", subtext: "text-orange-100", label: "🏆 Top Pick" },
  "Techstars":                  { card: "bg-gradient-to-br from-gray-900 to-black border-gray-700",           badge: "bg-gray-700 text-gray-200",     text: "text-white", subtext: "text-gray-300",   label: "⭐ Elite" },
  "Devpost Hackathons":         { card: "bg-gradient-to-br from-indigo-600 to-blue-700 border-indigo-500",    badge: "bg-indigo-800 text-indigo-100", text: "text-white", subtext: "text-indigo-100", label: "🛠 Build" },
  "Sequoia Arc":                { card: "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600",     badge: "bg-slate-700 text-slate-200",   text: "text-white", subtext: "text-slate-300",  label: "⭐ Elite" },
  "Antler":                     { card: "bg-gradient-to-br from-teal-600 to-emerald-700 border-teal-500",     badge: "bg-teal-800 text-teal-100",     text: "text-white", subtext: "text-teal-100",   label: "🌍 Global" },
  "Thiel Fellowship":           { card: "bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-300",    badge: "bg-amber-600 text-amber-100",   text: "text-gray-900", subtext: "text-amber-800", label: "🏆 Prestigious" },
  "Entrepreneur First":         { card: "bg-gradient-to-br from-purple-600 to-purple-800 border-purple-500",  badge: "bg-purple-900 text-purple-100", text: "text-white", subtext: "text-purple-100", label: "🚀 Pre-team" },
  "Breakthrough Energy Fellows":{ card: "bg-gradient-to-br from-sky-500 to-blue-700 border-sky-400",          badge: "bg-sky-800 text-sky-100",       text: "text-white", subtext: "text-sky-100",    label: "🌱 Climate" },
  "Microsoft for Startups":     { card: "bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500",        badge: "bg-blue-900 text-blue-100",     text: "text-white", subtext: "text-blue-100",   label: "💰 Free Credits" },
  "AWS Activate":               { card: "bg-gradient-to-br from-orange-400 to-amber-600 border-orange-300",   badge: "bg-orange-700 text-orange-100", text: "text-white", subtext: "text-orange-100", label: "💰 Free Credits" },
  "Google Cloud for Startups":  { card: "bg-gradient-to-br from-blue-500 to-cyan-600 border-blue-400",        badge: "bg-blue-800 text-blue-100",     text: "text-white", subtext: "text-blue-100",   label: "💰 Free Credits" },
  "OpenAI Startup Fund":        { card: "bg-gradient-to-br from-emerald-500 to-green-700 border-emerald-400", badge: "bg-emerald-800 text-emerald-100",text: "text-white", subtext: "text-emerald-100",label: "🤖 AI" },
  "OpenAI Converge":            { card: "bg-gradient-to-br from-emerald-500 to-green-700 border-emerald-400", badge: "bg-emerald-800 text-emerald-100",text: "text-white", subtext: "text-emerald-100",label: "🤖 AI" },
  "a16z Speedrun":              { card: "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600",         badge: "bg-gray-700 text-gray-200",     text: "text-white", subtext: "text-gray-300",   label: "⭐ Elite" },
  "AI Grant":                   { card: "bg-gradient-to-br from-violet-600 to-purple-800 border-violet-500",   badge: "bg-violet-900 text-violet-100", text: "text-white", subtext: "text-violet-100", label: "🤖 AI" },
  "Greylock Edge":              { card: "bg-gradient-to-br from-slate-700 to-slate-900 border-slate-500",      badge: "bg-slate-800 text-slate-200",   text: "text-white", subtext: "text-slate-300",  label: "⭐ Elite" },
  "Betaworks AI Camp":          { card: "bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-400",   badge: "bg-indigo-900 text-indigo-100", text: "text-white", subtext: "text-indigo-100", label: "🤖 AI Camp" },
  "PearX":                      { card: "bg-gradient-to-br from-pink-500 to-rose-600 border-pink-400",         badge: "bg-pink-800 text-pink-100",     text: "text-white", subtext: "text-pink-100",   label: "🚀 Silicon Valley" },
  "SBIR / STTR":                { card: "bg-gradient-to-br from-blue-700 to-indigo-800 border-blue-600",      badge: "bg-blue-900 text-blue-100",     text: "text-white", subtext: "text-blue-100",   label: "🇺🇸 Gov Grant" },
  "EIC Accelerator (EU)":       { card: "bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500",      badge: "bg-blue-900 text-blue-100",     text: "text-white", subtext: "text-blue-100",   label: "🇪🇺 EU Grant" },
  "Earthshot Prize":            { card: "bg-gradient-to-br from-green-600 to-emerald-800 border-green-500",   badge: "bg-green-900 text-green-100",   text: "text-white", subtext: "text-green-100",  label: "🌍 Climate" },
  "XPRIZE":                     { card: "bg-gradient-to-br from-rose-600 to-red-800 border-rose-500",         badge: "bg-rose-900 text-rose-100",     text: "text-white", subtext: "text-rose-100",   label: "🚀 Moonshot" },
  "TechCrunch Battlefield":     { card: "bg-gradient-to-br from-green-500 to-green-700 border-green-400",     badge: "bg-green-800 text-green-100",   text: "text-white", subtext: "text-green-100",  label: "📣 High Visibility" },
}

const TYPE_COLORS: Record<string, string> = {
  Accelerator: "bg-blue-100 text-blue-800",
  Grant:       "bg-green-100 text-green-800",
  Fellowship:  "bg-purple-100 text-purple-800",
  Incubator:   "bg-orange-100 text-orange-800",
  Competition: "bg-yellow-100 text-yellow-800",
  Other:       "bg-gray-100 text-gray-700",
}

// Hardcoded acceptance rates for well-known programs
const ACCEPTANCE_RATES: Record<string, string> = {
  "Y Combinator":           "~1.5%",
  "Techstars":              "~1%",
  "Thiel Fellowship":       "~0.5%",
  "Entrepreneur First":     "~3%",
  "Antler":                 "~2%",
  "Sequoia Arc":            "~1%",
  "MassChallenge":          "~10%",
  "Seedcamp":               "~1%",
  "MIT $100K Competition":  "~5%",
  "Hult Prize":             "~0.05%",
  "TechCrunch Battlefield": "~2%",
  "TED Fellows":            "~1%",
  "Echoing Green Fellowship":"~1%",
  "Ashoka Fellowship":      "~1%",
  "Obama Foundation Fellowship":"~0.5%",
  "NSF Seed Fund (SBIR)":   "~15%",
  "500 Global":             "~3%",
  "IndieBio":               "~2%",
}

function DeadlineBadge({ deadline, light }: { deadline: string; light?: boolean }) {
  if (!deadline || deadline === "Unknown") return null
  if (deadline === "Rolling") {
    return <span className={`text-xs ${light ? "text-white/70" : "text-gray-500"}`}>Rolling deadline</span>
  }
  const date = new Date(deadline)
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / 86400000)
  const color = daysLeft < 0
    ? (light ? "text-white/50 line-through" : "text-gray-400 line-through")
    : daysLeft <= 14
    ? (light ? "text-red-200 font-semibold" : "text-red-600 font-semibold")
    : daysLeft <= 30
    ? (light ? "text-yellow-200" : "text-orange-500")
    : (light ? "text-white/70" : "text-gray-500")

  return (
    <span className={`text-xs ${color}`}>
      {daysLeft < 0 ? "Closed" : `${daysLeft}d left — `}
      {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
    </span>
  )
}

export default function OpportunityCard({ op }: { op: Opportunity }) {
  const featured = FEATURED[op.name]
  const acceptanceRate = ACCEPTANCE_RATES[op.name]
  const isFeatured = Boolean(featured)

  if (isFeatured) {
    return (
      <div className={`rounded-xl p-5 flex flex-col gap-3 border ${featured.card} shadow-md hover:shadow-lg transition-shadow relative overflow-hidden`}>
        {featured.label && (
          <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
            {featured.label}
          </span>
        )}
        <div className="flex items-start justify-between gap-2 pr-16">
          <h2 className={`font-bold text-sm leading-snug ${featured.text}`}>{op.name}</h2>
        </div>
        <span className={`self-start text-xs px-2 py-0.5 rounded-full font-medium ${featured.badge}`}>
          {op.type}
        </span>

        {op.description && (
          <p className={`text-xs leading-relaxed line-clamp-3 ${featured.subtext}`}>{op.description}</p>
        )}

        <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${featured.subtext}`}>
          {op.geography && op.geography !== "Unknown" && <span>📍 {op.geography}</span>}
          {op.stage     && op.stage     !== "Unknown" && <span>🌱 {op.stage}</span>}
          {op.equity    && op.equity    !== "Unknown" && <span>💰 {op.equity}</span>}
          {op.funding_amount && op.funding_amount !== "Unknown" && <span>🏆 {op.funding_amount}</span>}
          {acceptanceRate && <span>🎯 {acceptanceRate} acceptance</span>}
        </div>

        {op.domain && op.domain !== "Any" && op.domain !== "Unknown" && (
          <div className="flex flex-wrap gap-1">
            {op.domain.split(",").map((tag) => (
              <span key={tag.trim()} className={`text-xs px-2 py-0.5 rounded-full bg-white/20 ${featured.text}`}>
                {tag.trim()}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/20">
          <DeadlineBadge deadline={op.deadline} light />
          <a
            href={op.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Apply →
          </a>
        </div>
      </div>
    )
  }

  // Default card
  const typeColor = TYPE_COLORS[op.type] ?? TYPE_COLORS.Other
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-gray-900 text-sm leading-snug">{op.name}</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${typeColor}`}>
          {op.type}
        </span>
      </div>

      {op.description && (
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{op.description}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {op.geography     && op.geography     !== "Unknown" && <span>📍 {op.geography}</span>}
        {op.stage         && op.stage         !== "Unknown" && <span>🌱 {op.stage}</span>}
        {op.equity        && op.equity        !== "Unknown" && <span>💰 {op.equity}</span>}
        {op.funding_amount && op.funding_amount !== "Unknown" && <span>🏆 {op.funding_amount}</span>}
        {acceptanceRate && <span>🎯 {acceptanceRate} acceptance</span>}
      </div>

      {op.domain && op.domain !== "Any" && op.domain !== "Unknown" && (
        <div className="flex flex-wrap gap-1">
          {op.domain.split(",").map((tag) => (
            <span key={tag.trim()} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <DeadlineBadge deadline={op.deadline} />
        <a
          href={op.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Apply →
        </a>
      </div>
    </div>
  )
}
