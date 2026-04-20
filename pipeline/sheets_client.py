import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials

SCOPES = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

SHEET_NAME = "FounderMap"

TAB_RAW = "raw_incoming"
TAB_APPROVED = "approved"
TAB_SUBMISSIONS = "submissions_pending"

# Column order must match the schema in PRD exactly
APPROVED_HEADERS = [
    "id", "name", "url", "type", "stage", "geography",
    "equity", "domain", "deadline", "funding_amount",
    "description", "source", "added_at", "legitimacy_score",
]


def get_client():
    # GitHub Actions injects the service account JSON as an env var (secret)
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        creds_dict = json.loads(creds_json)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, SCOPES)
    else:
        # Local dev: use a creds.json file (git-ignored)
        creds = ServiceAccountCredentials.from_json_keyfile_name("creds.json", SCOPES)
    return gspread.authorize(creds)


def get_sheet(tab_name: str):
    client = get_client()
    return client.open(SHEET_NAME).worksheet(tab_name)


def get_existing_urls(tab_name: str = TAB_APPROVED) -> set:
    sheet = get_sheet(tab_name)
    # URL is the 3rd column (index 2, 1-based col 3)
    urls = sheet.col_values(3)
    return set(urls[1:])  # skip header row


def append_approved_row(row: dict):
    sheet = get_sheet(TAB_APPROVED)
    values = [str(row.get(col, "")) for col in APPROVED_HEADERS]
    sheet.append_row(values, value_input_option="USER_ENTERED")


def append_raw_row(row: dict):
    sheet = get_sheet(TAB_RAW)
    sheet.append_row([
        row.get("title", ""),
        row.get("url", ""),
        row.get("source", ""),
        row.get("date", ""),
        "pending",
    ], value_input_option="USER_ENTERED")
