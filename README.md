# FounderMap

**A free, open-source, community-powered global aggregator of founder opportunities.**

FounderMap indexes every incubator, accelerator, grant, and fellowship program worldwide — no paywalls, no gatekeeping. An autonomous data pipeline scrapes 5+ public sources every 72 hours, classifies each entry via an LLM agent to extract structured metadata, validates community submissions through a legitimacy-scoring agent, and surfaces everything through a filterable Next.js frontend. Zero infrastructure cost.

[![Pipeline](https://github.com/SAQLAINAP/FounderMap/actions/workflows/pipeline.yml/badge.svg)](https://github.com/SAQLAINAP/FounderMap/actions/workflows/pipeline.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## The Problem

- YC, Techstars, and ~50 well-known programs capture 95% of all applications
- Thousands of regional, domain-specific, and government-backed programs go undiscovered
- Existing aggregators (GrantWatch, ProFellow, F6S) are paywalled, US-centric, or siloed by category
- No single free, globally-scoped, real-time source of truth exists for founder opportunities

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions (every 72h)                       │
│                                                                          │
│   ┌─────────────────────────────────┐  ┌────────────────────────────┐   │
│   │      scrape-and-classify         │  │    validate-submissions      │   │
│   │                                 │  │                            │   │
│   │  scraper.py                     │  │  validate_submission.py    │   │
│   │  ┌────────────┐                 │  │  ┌────────────────────┐    │   │
│   │  │ Hacker News│ (Algolia API)   │  │  │ URL reachability   │    │   │
│   │  │ Reddit RSS │ (r/startups…)   │  │  │ Duplicate check    │    │   │
│   │  │ F6S RSS    │                 │  │  │ Groq LLM scoring   │    │   │
│   │  │ Devpost API│                 │  │  │ Domain reputation  │    │   │
│   │  └─────┬──────┘                 │  │  └────────┬───────────┘    │   │
│   │        │ dedup by URL hash      │  │           │                │   │
│   │        ▼                        │  │           ▼                │   │
│   │  classifier.py                  │  │  score >= 70 → approve     │   │
│   │  ┌──────────────────────┐       │  │  score 40–69 → review      │   │
│   │  │ Groq API             │       │  │  score < 40  → reject      │   │
│   │  │ Llama 3.3 70B        │       │  └────────────────────────────┘   │
│   │  │ extracts: type/stage/│       │                                    │
│   │  │ geo/equity/domain/   │       │                                    │
│   │  │ deadline/score       │       │                                    │
│   │  └──────────┬───────────┘       │                                    │
│   │             │ score >= 50       │                                    │
│   └─────────────┼───────────────────┘                                    │
└─────────────────┼──────────────────────────────────────────────────────-─┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Google Sheets (Database)                          │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  raw_incoming    │  │    approved       │  │  submissions_pending  │  │
│  │  (status=pending)│→ │  (14 columns)     │← │  (Google Form input) │  │
│  └──────────────────┘  └────────┬─────────┘  └──────────────────────┘  │
│                                 │ public JSON API (gviz/tq)             │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     Next.js 14 Frontend (Vercel)                         │
│                                                                          │
│  fetch + ISR (1h revalidation)                                           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Filter by: type · stage · domain · geography · equity           │   │
│  │  Search: full-text across name / description / geo / domain      │   │
│  │  Sort by: legitimacy score · funding · deadline · added date     │   │
│  │  Cards: featured programs (28) with custom styling + accept rates│   │
│  │  Submit a Program → Google Form → submissions_pending tab        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Automated pipeline** — scrapes 5 public sources every 72 hours via GitHub Actions
- **LLM classification** — Groq (Llama 3.3 70B) extracts type, stage, geography, equity, domain, deadline, and a 0–100 legitimacy score per entry
- **Community submissions** — Google Form feeds a validation agent that checks URL reachability, deduplicates, scores legitimacy, and auto-approves/rejects
- **Filterable frontend** — search + 6 filter dimensions + 5 sort options, all client-side
- **Featured programs** — 28 well-known programs (YC, Techstars, a16z, etc.) with custom styling and acceptance rates
- **Deadline tracking** — color-coded days-remaining badges (red < 14 days, orange < 30 days)
- **Zero infrastructure cost** — GitHub Actions free tier + Google Sheets + Vercel free tier + Groq free tier

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| CI / Cron | GitHub Actions | Runs every 72 hours, 2 parallel jobs |
| Scraping | Python + requests + feedparser | Hacker News, Reddit, F6S, Devpost |
| LLM | Groq API — Llama 3.3 70B | Free tier, deterministic (temp=0.1) |
| Database | Google Sheets | Public JSON read, service account write |
| Frontend | Next.js 14 (App Router) + TypeScript | ISR, 1-hour revalidation |
| Styling | Tailwind CSS 3 | No external component library |
| Hosting | Vercel | Free hobby tier, auto-deploys from git |
| Forms | Google Forms | Native Sheets integration |

---

## Data Schema (`approved` tab)

| Column | Type | Example |
|--------|------|---------|
| `id` | string | MD5 hash of URL |
| `name` | string | `Y Combinator` |
| `url` | string | `https://www.ycombinator.com/apply` |
| `type` | enum | `Accelerator` / `Grant` / `Fellowship` / `Incubator` / `Competition` / `Other` |
| `stage` | enum | `Idea` / `MVP` / `Revenue` / `Any` |
| `geography` | string | `Global`, `USA`, `Europe`, … |
| `equity` | string | `Non-dilutive`, `7% equity`, `Unknown` |
| `domain` | string | `AI`, `Climate`, `HealthTech`, `Any`, … |
| `deadline` | string | ISO date or `Rolling` |
| `funding_amount` | string | `$500k`, `Unknown` |
| `description` | string | 1–2 sentence summary |
| `source` | string | `HN` / `Reddit` / `F6S` / `community` |
| `added_at` | datetime | ISO 8601 timestamp |
| `legitimacy_score` | integer | 0–100 |

---

## Directory Structure

```
FounderMap/
├── .github/
│   └── workflows/
│       └── pipeline.yml          # GitHub Actions: scrape + classify + validate
├── frontend/                     # Next.js web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout, metadata, Inter font
│   │   │   └── page.tsx          # Homepage — fetch, filter, render
│   │   ├── components/
│   │   │   ├── Filters.tsx       # Filter + search UI
│   │   │   └── OpportunityCard.tsx # Card with featured styling + deadline badge
│   │   └── lib/
│   │       └── sheets.ts         # Google Sheets gviz/tq parser
│   ├── .env.local.example
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── pipeline/                     # Python backend
│   ├── scraper.py                # Fetches raw opportunities from 5 sources
│   ├── classifier.py             # Groq LLM classification agent
│   ├── validate_submission.py    # Community submission validation agent
│   ├── sheets_client.py          # gspread wrapper with exponential backoff
│   ├── seed_data.py              # Initial 302 programs
│   └── requirements.txt
├── PRD.md                        # Product requirements document
├── SETUP.md                      # One-time setup guide
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A Google Sheet set up per [SETUP.md](SETUP.md)
- A [Groq API key](https://console.groq.com) (free, no credit card)

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SHEET_ID=<your_sheet_id>
#   NEXT_PUBLIC_SUBMIT_FORM_URL=<your_google_form_url>
npm run dev        # http://localhost:3000
```

### Pipeline

```bash
cd pipeline
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Credentials — pick one:
# Option A (local): download service account JSON → save as pipeline/creds.json
# Option B (CI-style): export GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'

export GROQ_API_KEY=your_key_here

python scraper.py                 # Fetch raw opportunities → raw_incoming tab
python classifier.py              # Classify pending rows → approved tab
python validate_submission.py     # Validate community submissions
```

---

## Environment Variables

### Frontend (Vercel / `.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SHEET_ID` | Google Sheet ID (from the URL) |
| `NEXT_PUBLIC_SUBMIT_FORM_URL` | Google Form URL for community submissions |

### Pipeline (GitHub Secrets)

| Secret | Description |
|--------|-------------|
| `GOOGLE_CREDENTIALS_JSON` | Full JSON contents of the Google Cloud service account key |
| `GROQ_API_KEY` | Groq API key |

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/pipeline.yml`) runs **every 72 hours** and on manual dispatch with two parallel jobs:

```
on:
  schedule: cron '0 */72 * * *'
  workflow_dispatch:

jobs:
  scrape-and-classify:       # scraper.py → classifier.py (sequential)
  validate-submissions:      # validate_submission.py
```

Trigger a manual run: **GitHub repo → Actions → FounderMap Pipeline → Run workflow**

---

## Scraped Sources

| Source | Method | Query |
|--------|--------|-------|
| Hacker News | Algolia Search API | `accelerator`, `fellowship grant founder`, `incubator apply` (last 30 days) |
| Reddit | RSS feeds | r/startups, r/entrepreneur, r/forhire |
| F6S | RSS feed | Public accelerator/grant feed |
| Devpost | REST API | Open hackathons sorted by prize |

All sources are deduplicated by normalized URL hash before writing to `raw_incoming`.

---

## Community Submission Flow

1. Visitor clicks **Submit a Program** → Google Form
2. Form response lands in `submissions_pending` tab
3. Validation agent (GitHub Actions) runs:
   - URL reachability check (HTTP HEAD, status < 400)
   - Duplicate detection against `approved` tab
   - Groq LLM legitimacy scoring with domain reputation bonuses/penalties
   - Suspicious TLD detection (`.xyz`, `.top`, `.click`, `.loan`)
   - Known good domain bonus (`grants.gov`, `mozilla.org`, `microsoft.com`, …)
4. Score ≥ 70 → auto-approved to `approved` tab (`source = "community"`)
5. Score 40–69 → flagged for manual review
6. Score < 40 → auto-rejected with reason logged

---

## Deployment

### Vercel (Frontend)

1. Push repo to GitHub
2. Import at [vercel.com](https://vercel.com) → set `NEXT_PUBLIC_SHEET_ID` and `NEXT_PUBLIC_SUBMIT_FORM_URL`
3. Deploy — live at `yourproject.vercel.app`

Vercel auto-deploys on every push to `main`. The frontend uses ISR with a 1-hour revalidation window — no separate deploy needed when Sheet data changes.

### Google Sheets (Database)

Follow [SETUP.md](SETUP.md) to:
- Create the Sheet with correct tabs and headers
- Grant public Viewer access (read)
- Grant Editor access to the service account (write)

---

## Roadmap

- [x] Automated scraper pipeline (Hacker News, Reddit, F6S, Devpost)
- [x] LLM classification agent (Groq / Llama 3.3 70B)
- [x] Next.js frontend with filters, search, and sorting
- [x] Community submission validation agent
- [x] Featured program cards with acceptance rates
- [ ] Email digest (Resend free tier)
- [ ] Twitter/X scraping via unofficial API
- [ ] "Suggest an edit" flow per listing
- [ ] Telegram / WhatsApp bot

---

## Contributing

1. Fork the repo
2. Submit a program via the **Submit a Program** button on the live site, or
3. Open a PR to improve the scraper, classifier, or frontend

This is community welfare infrastructure — no paid tiers, no monetization, ever.

---

## License

MIT
