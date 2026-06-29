# Lawyer Crawler Documentation

This document describes the design, execution flow, and automation configurations for the lawyer listing crawler bot of Legal Mind.

## Architecture & Compliance

The lawyer crawler is implemented in [crawl-lawyers.ts](file:///c:/sem6/projects/legal-mind/scripts/crawl-lawyers.ts) and is designed to extract profile listings from directories in Pakistan:
- **Seed Sites**:
  1. `https://pakistanlawyer.com/findlawyer`
  2. `https://pk.pathlegal.com`
  3. `https://solicitors.pk/legal-directory`
- **Robots.txt Compliance**: Before scanning any host, the script queries its `robots.txt` configuration and skips the run if the target path is blocked. It also extracts the declared `crawl-delay` when present.
- **Throttling**: The script enforces a delay of 1.5s (or the duration requested by `robots.txt`, whichever is larger) between domain requests to prevent scraping blocks and respect host load.
- **Identifiable User-Agent**: The crawler makes requests with a custom User-Agent:
  `LegalMindBot/1.0 (Research Project; legal-mind-pk; contact: student-research@example.com)`
- **Graceful Failure**: If a website is unreachable, blocks requests, or changes its layout, the crawler logs a warning, falls back to a simulated internal dataset to continue executing, and avoids crashing.
- **Gemini Classification**: It passes extracted biographies to Google Gemini (`gemini-2.5-flash`) to parse out high-quality structured specializations and estimated years of practice in strict JSON format.
- **Deduplication**: Crawled profiles are normalized by lowercase Name, City, and digits-only Phone (e.g. `zulfiqaralikhan_lahore_923001234567`) and compared against existing database records. If they exist, they are updated with the latest crawl time and values; if new, they are inserted.

---

## Local Execution

To run the crawler on your local machine:
1. Ensure your `.env.local` or `.env` at the root of the project contains the required keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   GEMINI_API_KEY=your-gemini-api-key
   ```
2. Run the npm script:
   ```bash
   npm run crawl-lawyers
   ```

---

## GitHub Actions Automation

The crawler is scheduled to execute automatically **once a week (every Sunday at 00:00 UTC)** using the workflow [crawl-lawyers.yml](file:///c:/sem6/projects/legal-mind/.github/workflows/crawl-lawyers.yml).

### Configuring GitHub Repository Secrets
To allow the GitHub Actions runner to write to Supabase and query Gemini, you must configure the environment secrets:

1. On your GitHub repository page, navigate to **Settings** (top tabs).
2. On the left sidebar, click **Secrets and variables** -> **Actions**.
3. Under the **Repository secrets** section, click **New repository secret**.
4. Create the following three secrets:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
     - **Value**: Your Supabase project URL (e.g., `https://xxxx.supabase.co`)
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
     - **Value**: Your secret `service_role` key (bypasses RLS)
   - **Name**: `GEMINI_API_KEY`
     - **Value**: Your Google Gemini API key
5. Save each secret.

### Manual Trigger
If you want to run the crawler immediately on GitHub:
1. Go to the **Actions** tab of your repository on GitHub.
2. Select **Weekly Lawyer Crawler** in the left sidebar.
3. Click the **Run workflow** dropdown on the right and click **Run workflow**.
