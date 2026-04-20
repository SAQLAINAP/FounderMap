"""
validate_submission.py — processes community submissions from the submissions_pending tab.
Validates URL, classifies via Groq, scores legitimacy, auto-approves or flags.

This is the "validation agent" — the most interview-worthy piece of the project.
"""

import os
import json
import hashlib
import requests
from datetime import datetime, timezone

from groq import Groq
from sheets_client import (
    get_sheet, append_approved_row, get_existing_urls,
    TAB_SUBMISSIONS, TAB_APPROVED,
)

GROQ_MODEL = "llama-3.3-70b-versatile"

AUTO_APPROVE_THRESHOLD = 70
FLAG_THRESHOLD = 40  # below this = auto-reject

SUSPICIOUS_TLDS = {".xyz", ".top", ".click", ".loan", ".win", ".gq", ".ml", ".cf", ".ga", ".tk"}
KNOWN_GOOD_DOMAINS = {
    "ycombinator.com", "techstars.com", "500.co", "antler.co", "seedcamp.com",
    "mozilla.org", "google.org", "microsoft.com", "aws.amazon.com",
    "nlnet.nl", "grants.gov", "ssir.org", "fellowship.ai",
}


def check_url_reachable(url: str) -> tuple[bool, int]:
    try:
        resp = requests.head(url, allow_redirects=True, timeout=10, headers={
            "User-Agent": "FounderMap-validator/1.0"
        })
        return resp.status_code < 400, resp.status_code
    except Exception:
        return False, 0


def domain_score_bonus(url: str) -> int:
    """Returns a bonus/penalty based on domain reputation heuristics."""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc.lower().lstrip("www.")
        if any(domain.endswith(tld) for tld in SUSPICIOUS_TLDS):
            return -30
        if any(domain == good or domain.endswith("." + good) for good in KNOWN_GOOD_DOMAINS):
            return 20
    except Exception:
        pass
    return 0


VALIDATION_SYSTEM_PROMPT = """You are a validation agent for FounderMap, a community-maintained global database of founder opportunities.

A community member has submitted a program. Your job is to verify it's a legitimate, real opportunity.

Return ONLY valid JSON with this exact shape:
{
  "name": "Cleaned program name",
  "type": "Accelerator|Grant|Fellowship|Incubator|Competition|Other",
  "stage": "Idea|MVP|Revenue|Any",
  "geography": "Country or region or Global",
  "equity": "Non-dilutive|X% equity|Unknown",
  "domain": "comma-separated tags",
  "deadline": "YYYY-MM-DD or Rolling or Unknown",
  "funding_amount": "$X or Unknown",
  "description": "1-2 sentence factual summary",
  "legitimacy_score": 0-100,
  "rejection_reason": "null or brief reason if score < 40"
}

Legitimacy scoring:
- 90-100: Verified, well-known, clearly a real opportunity
- 70-89: Credible org, real apply link, clear program details
- 50-69: Seems legitimate but missing key details
- 40-49: Unclear legitimacy, sparse info
- 0-39: Likely spam, scam, affiliate link, or not a real program

Red flags:
- URL redirects through affiliate trackers
- No clear application process described
- "Apply now for guaranteed funding" language
- Price to apply or "investment required"
- Newly registered domains for high-value claims
"""


def validate_submission(title: str, url: str, description: str) -> dict | None:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    user_msg = f"Program name: {title}\nURL: {url}\nSubmitter description: {description}"
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": VALIDATION_SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.1,
            max_tokens=512,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        print(f"[validator] LLM failed for '{title}': {e}")
        return None


def process_submissions():
    sub_sheet = get_sheet(TAB_SUBMISSIONS)
    all_rows = sub_sheet.get_all_records()
    existing_urls = get_existing_urls(TAB_APPROVED)

    # Google Form columns expected: timestamp, name, url, description, submitter_email, status
    STATUS_COL = 6  # 1-based column index for status

    for i, row in enumerate(all_rows, start=2):
        status = str(row.get("status", "")).strip().lower()
        if status and status != "pending":
            continue

        name = str(row.get("Program Name", row.get("name", ""))).strip()
        url = str(row.get("URL", row.get("url", ""))).strip()
        description = str(row.get("Description", row.get("description", ""))).strip()

        if not url:
            sub_sheet.update_cell(i, STATUS_COL, "rejected_no_url")
            continue

        # Step 1: URL reachability check
        reachable, status_code = check_url_reachable(url)
        if not reachable:
            print(f"[validator] UNREACHABLE ({status_code}): {url}")
            sub_sheet.update_cell(i, STATUS_COL, f"rejected_url_dead_{status_code}")
            continue

        # Step 2: Duplicate check
        canonical = url.split("?")[0].rstrip("/")
        if canonical in existing_urls:
            sub_sheet.update_cell(i, STATUS_COL, "rejected_duplicate")
            continue

        # Step 3: LLM validation
        result = validate_submission(name, url, description)
        if result is None:
            sub_sheet.update_cell(i, STATUS_COL, "error_llm_failed")
            continue

        base_score = int(result.get("legitimacy_score", 0))
        domain_bonus = domain_score_bonus(url)
        final_score = max(0, min(100, base_score + domain_bonus))

        print(f"[validator] '{name}' score={final_score} (base={base_score}, domain_bonus={domain_bonus})")

        if final_score < FLAG_THRESHOLD:
            reason = result.get("rejection_reason", "low legitimacy score")
            sub_sheet.update_cell(i, STATUS_COL, f"rejected: {reason}")
            continue

        if final_score < AUTO_APPROVE_THRESHOLD:
            # Flag for manual review — don't auto-approve
            sub_sheet.update_cell(i, STATUS_COL, f"needs_review_score_{final_score}")
            continue

        # Auto-approve
        approved_row = {
            "id": hashlib.md5(canonical.encode()).hexdigest(),
            "name": result.get("name", name),
            "url": canonical,
            "type": result.get("type", "Other"),
            "stage": result.get("stage", "Any"),
            "geography": result.get("geography", "Unknown"),
            "equity": result.get("equity", "Unknown"),
            "domain": result.get("domain", "Any"),
            "deadline": result.get("deadline", "Unknown"),
            "funding_amount": result.get("funding_amount", "Unknown"),
            "description": result.get("description", description[:200]),
            "source": "community",
            "added_at": datetime.now(timezone.utc).isoformat(),
            "legitimacy_score": final_score,
        }
        append_approved_row(approved_row)
        existing_urls.add(canonical)
        sub_sheet.update_cell(i, STATUS_COL, f"approved_score_{final_score}")
        print(f"[validator] AUTO-APPROVED: {name}")


if __name__ == "__main__":
    process_submissions()
