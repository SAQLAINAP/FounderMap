"""
classifier.py — reads raw_incoming rows with status=pending, classifies each
via Groq (free), writes structured rows to the approved tab.
"""

import os
import json
import hashlib
from datetime import datetime, timezone

from groq import Groq
from sheets_client import get_sheet, append_approved_row, TAB_RAW, TAB_APPROVED, get_existing_urls

GROQ_MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a classification agent for FounderMap, a global database of founder opportunities.

Given a program title and URL, extract structured metadata and return ONLY valid JSON.

Return this exact shape:
{
  "name": "Program name (cleaned)",
  "type": "Accelerator|Grant|Fellowship|Incubator|Competition|Other",
  "stage": "Idea|MVP|Revenue|Any",
  "geography": "Country or region or Global",
  "equity": "Non-dilutive|X% equity|Unknown",
  "domain": "comma-separated tags e.g. AI,Climate,Any",
  "deadline": "YYYY-MM-DD or Rolling or Unknown",
  "funding_amount": "$X or Unknown",
  "description": "1-2 sentence factual summary of what the program offers",
  "legitimacy_score": 0-100
}

Legitimacy scoring guide:
- 90-100: Well-known program with clear deadline and apply link (YC, Techstars tier)
- 70-89: Credible org, clear details, verifiable URL
- 50-69: Appears legitimate but limited info or unclear deadline
- 30-49: Vague, possibly promotional content
- 0-29: Likely spam, scam, or not an actual opportunity

If the title/URL is clearly not a founder opportunity (news article, job posting, discussion thread), set legitimacy_score to 0.
"""


def classify_row(title: str, url: str) -> dict | None:
    client = Groq(api_key=os.environ["GROQ_API_KEY"])
    user_msg = f"Title: {title}\nURL: {url}"
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0.1,
            max_tokens=512,
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code fences if Groq wraps the JSON
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        print(f"[classifier] failed for '{title}': {e}")
        return None


def process_pending():
    raw_sheet = get_sheet(TAB_RAW)
    all_rows = raw_sheet.get_all_records()
    existing_approved_urls = get_existing_urls(TAB_APPROVED)

    processed = 0
    approved = 0

    for i, row in enumerate(all_rows, start=2):  # row 1 is header
        if row.get("status", "").lower() != "pending":
            continue

        title = row.get("title", "").strip()
        url = row.get("url", "").strip()
        source = row.get("source", "")

        if not title or not url:
            raw_sheet.update_cell(i, 5, "skipped_no_data")
            continue

        if url in existing_approved_urls:
            raw_sheet.update_cell(i, 5, "duplicate")
            continue

        result = classify_row(title, url)
        processed += 1

        if result is None:
            raw_sheet.update_cell(i, 5, "classify_error")
            continue

        score = int(result.get("legitimacy_score", 0))

        # Mark row as processed regardless of approval
        raw_sheet.update_cell(i, 5, f"classified_score_{score}")

        if score < 50:
            print(f"[classifier] REJECTED (score {score}): {title}")
            continue

        approved_row = {
            "id": hashlib.md5(url.encode()).hexdigest(),
            "name": result.get("name", title),
            "url": url,
            "type": result.get("type", "Other"),
            "stage": result.get("stage", "Any"),
            "geography": result.get("geography", "Unknown"),
            "equity": result.get("equity", "Unknown"),
            "domain": result.get("domain", "Any"),
            "deadline": result.get("deadline", "Unknown"),
            "funding_amount": result.get("funding_amount", "Unknown"),
            "description": result.get("description", ""),
            "source": source,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "legitimacy_score": score,
        }
        append_approved_row(approved_row)
        existing_approved_urls.add(url)
        approved += 1
        print(f"[classifier] APPROVED (score {score}): {title}")

    print(f"[classifier] processed={processed}, approved={approved}")


if __name__ == "__main__":
    process_pending()
