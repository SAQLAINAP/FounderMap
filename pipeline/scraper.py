"""
scraper.py — fetches raw opportunities from free public sources.
Runs on GitHub Actions every 12h. Writes new rows to Google Sheets raw_incoming tab.
"""

import hashlib
import requests
import feedparser
from datetime import datetime, timezone

from sheets_client import get_existing_urls, append_raw_row, TAB_RAW

# ---------------------------------------------------------------------------
# Source: Hacker News (Algolia API — no key needed)
# ---------------------------------------------------------------------------
HN_API = "https://hn.algolia.com/api/v1/search_by_date"
HN_QUERIES = ["accelerator", "fellowship grant founder", "incubator apply"]


def fetch_hn() -> list[dict]:
    results = []
    for query in HN_QUERIES:
        params = {
            "query": query,
            "tags": "story",
            "hitsPerPage": 30,
            # only last 30 days — avoids re-processing old content
            "numericFilters": f"created_at_i>{int(datetime.now(timezone.utc).timestamp()) - 2592000}",
        }
        try:
            data = requests.get(HN_API, params=params, timeout=15).json()
            for hit in data.get("hits", []):
                if hit.get("url"):
                    results.append({
                        "title": hit["title"],
                        "url": hit["url"],
                        "source": "HN",
                        "date": hit.get("created_at", ""),
                    })
        except Exception as e:
            print(f"[HN] fetch failed for query '{query}': {e}")
    return results


# ---------------------------------------------------------------------------
# Source: Reddit RSS (no API key, public RSS endpoint)
# ---------------------------------------------------------------------------
REDDIT_SEARCHES = [
    "https://www.reddit.com/r/startups/search.rss?q=accelerator+OR+fellowship+OR+grant+OR+incubator&sort=new&restrict_sr=1",
    "https://www.reddit.com/r/entrepreneur/search.rss?q=accelerator+OR+grant+OR+fellowship&sort=new&restrict_sr=1",
    "https://www.reddit.com/r/forhire/search.rss?q=fellowship+grant&sort=new",
]
REDDIT_HEADERS = {"User-Agent": "FounderMap/1.0 (open-source community project)"}


def fetch_reddit() -> list[dict]:
    results = []
    for feed_url in REDDIT_SEARCHES:
        try:
            feed = feedparser.parse(feed_url, request_headers=REDDIT_HEADERS)
            for entry in feed.entries:
                results.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "source": "Reddit",
                    "date": entry.get("published", ""),
                })
        except Exception as e:
            print(f"[Reddit] fetch failed: {e}")
    return results


# ---------------------------------------------------------------------------
# Source: F6S (public RSS for accelerator/grant programs)
# ---------------------------------------------------------------------------
F6S_FEEDS = [
    "https://www.f6s.com/rss/programs/latest",
]


def fetch_f6s() -> list[dict]:
    results = []
    for feed_url in F6S_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries:
                results.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "source": "F6S",
                    "date": entry.get("published", ""),
                })
        except Exception as e:
            print(f"[F6S] fetch failed: {e}")
    return results


# ---------------------------------------------------------------------------
# Source: Devpost (hackathons/competitions — good for fellowships too)
# ---------------------------------------------------------------------------
def fetch_devpost() -> list[dict]:
    try:
        resp = requests.get(
            "https://devpost.com/api/hackathons?status[]=open&order_by=prize-amount&per_page=30",
            timeout=15,
        )
        data = resp.json()
        results = []
        for h in data.get("hackathons", []):
            results.append({
                "title": h.get("title", ""),
                "url": h.get("url", ""),
                "source": "Devpost",
                "date": h.get("submission_period_dates", ""),
            })
        return results
    except Exception as e:
        print(f"[Devpost] fetch failed: {e}")
        return []


# ---------------------------------------------------------------------------
# Dedup + write
# ---------------------------------------------------------------------------
def dedup_and_write(rows: list[dict]):
    existing_urls = get_existing_urls(TAB_RAW)
    new_count = 0
    for row in rows:
        url = row.get("url", "").strip()
        if not url or url in existing_urls:
            continue
        # Normalise: strip query params that are just tracking noise
        canonical = url.split("?")[0].rstrip("/")
        if canonical in existing_urls:
            continue
        row["url"] = canonical
        row["id"] = hashlib.md5(canonical.encode()).hexdigest()
        append_raw_row(row)
        existing_urls.add(canonical)
        new_count += 1
    print(f"[scraper] wrote {new_count} new rows to raw_incoming")


def main():
    print(f"[scraper] starting at {datetime.now(timezone.utc).isoformat()}")
    all_rows = []
    all_rows += fetch_hn()
    all_rows += fetch_reddit()
    all_rows += fetch_f6s()
    all_rows += fetch_devpost()
    print(f"[scraper] fetched {len(all_rows)} total rows across all sources")
    dedup_and_write(all_rows)


if __name__ == "__main__":
    main()
