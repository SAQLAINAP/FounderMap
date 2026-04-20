# Setup Guide (Do This Once)

## 1. Google Sheet

1. Create a new Google Sheet named exactly `FounderMap`
2. Create three tabs: `raw_incoming`, `approved`, `submissions_pending`
3. In `raw_incoming` tab, add headers in row 1: `title | url | source | date | status`
4. In `approved` tab, add headers: `id | name | url | type | stage | geography | equity | domain | deadline | funding_amount | description | source | added_at | legitimacy_score`
5. Make the sheet publicly readable: **Share → Anyone with the link → Viewer**
6. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/THIS_PART_HERE/edit`

## 2. Google Service Account (for pipeline write access)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → New Project
2. Enable **Google Sheets API** and **Google Drive API**
3. Create a Service Account (IAM → Service Accounts → Create)
4. Download the JSON key file
5. Share your Google Sheet with the service account email (Editor access)
6. The JSON contents become the `GOOGLE_CREDENTIALS_JSON` GitHub secret

## 3. Groq API Key (free)

1. Sign up at [console.groq.com](https://console.groq.com) — no credit card needed
2. Create an API key
3. This becomes the `GROQ_API_KEY` GitHub secret

## 4. GitHub Secrets

In your repo → Settings → Secrets and variables → Actions, add:
- `GOOGLE_CREDENTIALS_JSON` — full contents of your service account JSON
- `GROQ_API_KEY` — your Groq API key

## 5. Frontend (Vercel)

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your Sheet ID and form URL
npm run dev  # test locally
```

Deploy to Vercel:
1. Push repo to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set environment variables: `NEXT_PUBLIC_SHEET_ID`, `NEXT_PUBLIC_SUBMIT_FORM_URL`
4. Deploy — it's live at `yourproject.vercel.app`

## 6. Community Submission Form

1. Create a Google Form with fields: Program Name, URL, Description, Your Email
2. Link responses to `submissions_pending` tab of your Sheet
3. Copy the form URL into `NEXT_PUBLIC_SUBMIT_FORM_URL`

## 7. Trigger first run

Go to your GitHub repo → Actions → FounderMap Pipeline → Run workflow (manual trigger)
Watch the logs — first run should write rows to your Sheet.

---

## Local dev (pipeline)

```bash
cd pipeline
pip install -r requirements.txt
# Put your service account JSON at pipeline/creds.json
export GROQ_API_KEY=your_key_here
python scraper.py
python classifier.py
```
