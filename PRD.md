# FounderMap — Product Requirements Document

## Vision

A free, community-powered aggregator of every incubator, accelerator, grant, and fellowship program globally. No paywalls. No gatekeeping. Built to give every founder — regardless of geography or network — access to the same opportunities that well-connected founders in Silicon Valley take for granted.

---

## Problem

- YC, Techstars, and a few dozen well-known programs get 95% of applications
- Thousands of regional, domain-specific, and government-backed programs go undiscovered
- Existing aggregators (GrantWatch, ProFellow, F6S) are paywalled, US-centric, or siloed by category
- There is no single, free, globally-scoped, real-time source of truth for founder opportunities

---

## Target Users

| User | Need |
|------|------|
| Early-stage founder | Discover programs they're eligible for, sorted by deadline |
| Student entrepreneur | Find fellowships and no-equity grants |
| Program manager | Get their program listed (free submission) |
| Researcher / journalist | Browse the full landscape of the ecosystem |

---

## Core Features

### 1. Automated Scraper Pipeline (Backend)
- Runs every 12 hours via GitHub Actions (free tier)
- Sources: Hacker News, Reddit (r/startups, r/entrepreneur), F6S RSS, Devpost, public Twitter search terms
- Deduplicates by URL hash before writing
- Writes raw rows to Google Sheets tab: `raw_incoming`

### 2. LLM Classifier
- Runs after scraper on new rows
- Uses Groq API (Llama 3.3 70B — free tier)
- Classifies each row into structured fields:
  - `type`: Accelerator | Grant | Fellowship | Incubator | Competition | Other
  - `stage`: Idea | MVP | Revenue | Any
  - `geography`: Country / Region / Global
  - `equity`: Dilutive (%) | Non-dilutive | Unknown
  - `domain`: AI | Climate | HealthTech | FinTech | Any | etc.
  - `deadline`: ISO date or "Rolling"
  - `legitimacy_score`: 0–100 (heuristic)
- Approved rows (score ≥ 60) move to `approved` tab automatically

### 3. Public-Facing Website
- Next.js 14 (App Router), hosted on Vercel (free)
- Reads directly from Google Sheets public JSON endpoint — no backend needed
- Features:
  - Filter by type, stage, geography, domain, deadline
  - Search by keyword
  - Sort by deadline (default), date added, name
  - Card view with all structured fields visible
  - Direct apply link on each card
  - "Submit a Program" button → Google Form

### 4. Community Submission Pipeline
- Google Form captures: program name, URL, description, submitter email
- Form responses land in `submissions_pending` tab in Google Sheets
- Validation agent (GitHub Actions) runs every 6h on pending rows:
  - Fetches and validates the URL (resolves, not 404, not a scam domain)
  - Re-classifies using the same LLM classifier
  - Checks for duplicates against `approved` tab
  - Scores legitimacy (0–100)
  - Auto-approves if score ≥ 70, flags for manual review if 40–69, rejects if < 40
- Approved community submissions move to `approved` tab with source = "community"

---

## Data Schema (Google Sheets — `approved` tab)

| Column | Type | Notes |
|--------|------|-------|
| id | string | MD5 hash of URL |
| name | string | Program name |
| url | string | Canonical apply/info URL |
| type | enum | Accelerator / Grant / Fellowship / Incubator / Competition / Other |
| stage | enum | Idea / MVP / Revenue / Any |
| geography | string | Country, region, or "Global" |
| equity | string | "Non-dilutive", "X% equity", "Unknown" |
| domain | string | Comma-separated tags |
| deadline | string | ISO date or "Rolling" |
| funding_amount | string | "$X" or "Unknown" |
| description | string | 1–2 sentence summary |
| source | string | "HN" / "Reddit" / "F6S" / "community" / etc. |
| added_at | datetime | ISO timestamp |
| legitimacy_score | integer | 0–100 |

---

## Tech Stack (100% Free)

| Layer | Tool | Why |
|-------|------|-----|
| Cron / CI | GitHub Actions | 2,000 free min/month, version-controlled |
| Scraping | Python (requests, feedparser, snscrape) | No API keys needed for most sources |
| LLM | Groq API (Llama 3.3 70B) | Genuinely free tier, fast |
| Database | Google Sheets | Free, JSON API endpoint, visual admin panel |
| Frontend | Next.js 14 + Tailwind CSS | Vercel free tier, SSG for performance |
| Hosting | Vercel | Free forever for hobby projects |
| Forms | Google Forms | Free, native Sheets integration |
| Domain | .vercel.app subdomain | Free |

---

## Non-Goals (v1)

- No user accounts or auth
- No email digests (v2)
- No Telegram/WhatsApp bot (v2)
- No paid tiers ever — this is community welfare infrastructure
- No monetization

---

## Success Metrics (Personal / Resume)

- [ ] Pipeline running autonomously for 30+ days without manual intervention
- [ ] 500+ programs in the approved sheet
- [ ] Community submissions flowing and being validated by agent
- [ ] Site publicly accessible and indexed by Google
- [ ] GitHub repo starred by people outside your network

---

## Interview Story (How to Frame This)

> "I built an autonomous data pipeline that scrapes 6+ sources every 12 hours, classifies each entry via an LLM-powered agent to extract structured metadata (type, stage, geography, equity), and validates community submissions through a legitimacy-scoring agent — all running at zero infrastructure cost on GitHub Actions with Google Sheets as the backend. The frontend is a filterable Next.js app on Vercel. The hardest problem was deduplication across heterogeneous sources and designing the validation agent's scoring heuristic to minimize both false approvals and false rejections."

---

## Roadmap

### Week 1
- [ ] Google Sheet created with correct schema
- [ ] `scraper.py` running on GitHub Actions
- [ ] `classifier.py` classifying new rows via Groq
- [ ] Next.js site live on Vercel reading from Sheet

### Week 2
- [ ] Google Form for community submissions wired up
- [ ] `validate_submission.py` agent running on schedule
- [ ] Frontend filters and search working

### Month 2
- [ ] Twitter/X scraping via twikit (unofficial, free)
- [ ] Email digest (Resend free tier — 3k emails/month)
- [ ] "Suggest an edit" on each listing
