# Run & Write – Daily Prompt Oracle

Run & Write is a lightweight Vercel application that serves a daily creative writing prompt. A static landing page summons the current prompt through a serverless function backed by Upstash Redis, while dynamic prompt archive pages, a sitemap, and a history modal keep past "prophecies" discoverable.

## Features

- **Daily prompt generator** – Calls the Gemini API with a templated instruction to produce a single paragraph prompt that is cached for 24 hours.
- **Prompt history & archives** – Stores prompts in Redis using `prompt:YYYY-MM-DD` keys, exposes an archive modal, and provides permanent `/prompt/[date]` pages for each stored prompt.
- **Sitemap generation** – Builds an XML sitemap from Redis keys so search engines can index the archive.
- **Copy & share UX** – Offers copy-to-clipboard and Twitter share controls on individual prompt pages.

## Project structure

```
├── index.html             # Static landing page that fetches today's prompt
├── api/
│   ├── get-prompt.js      # POST handler for fetching today's prompt or the full history
│   ├── prompt/[date].js   # Dynamic prompt page rendered on demand for any stored date
│   └── sitemap.js         # XML sitemap generator sourced from Redis keys
├── package.json           # Declares serverless dependencies (Upstash Redis & Vercel KV client)
├── robots.txt             # Search engine crawling hints
└── vercel.json            # Vercel routing configuration
```

## Prerequisites

- Node.js 18 or newer (required by Vercel serverless functions).
- An [Upstash Redis](https://upstash.com/) database for prompt storage.
- A Google Gemini API key with access to the `gemini-2.5-flash-preview-05-20` model.
- (Optional) A Vercel account for hosting and local development via `vercel dev`.

## Environment variables

Create a `.env.local` file (used by Vercel CLI) or configure these variables in your deployment environment:

| Variable | Description |
| --- | --- |
| `MANUAL_UPSTASH_URL` | Upstash Redis REST URL. |
| `MANUAL_UPSTASH_TOKEN` | Upstash Redis REST token. |
| `GEMINI_API_KEY` | Google Gemini API key used to generate new prompts. |

The application bypasses the Vercel KV integration and instantiates `@upstash/redis` directly with the manual variables, so both `MANUAL_UPSTASH_URL` and `MANUAL_UPSTASH_TOKEN` must be present.

## Local development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start a local dev server**
   - If you are using Vercel CLI, run:
     ```bash
     npx vercel dev
     ```
   - Alternatively, host the static `index.html` with your preferred tooling and proxy API requests to the Node runtime that executes the files in `api/` (e.g., `vercel dev`, `netlify dev`, or a simple `node` server invoking the handlers).

3. **Request today's prompt**
   With your environment variables configured, open the site locally. The landing page issues a POST request to `/api/get-prompt` with `action: "get_today"`, which triggers a Gemini request (if not already cached) and displays the result.

4. **Inspect the archive**
   Click **View Prompt Archive** to fetch the stored history. Each entry links to `/prompt/YYYY-MM-DD`, which renders a dedicated page when visited.

## API reference

### `POST /api/get-prompt`

| Body field | Description |
| --- | --- |
| `action` | `"get_today"` (default) fetches or creates today's prompt. `"get_history"` returns an array of `{ date, prompt }`. |
| `prompt` | Required when requesting `get_today`. The base instruction passed to Gemini. |

Responses:
- `200 OK` with `{ text: string }` when returning a single prompt.
- `200 OK` with an array of history entries when `action` is `get_history`.
- `4xx/5xx` errors when misconfigured (missing env vars, missing prompt text, upstream failures, etc.).

### `GET /api/prompt/[date]`

Renders an HTML page for a specific date. Dates must be formatted as `YYYY-MM-DD`. Returns a 404 page if the prompt does not exist.

### `GET /api/sitemap`

Returns an XML sitemap that lists the landing page and all stored prompt URLs.

## Deployment

Deploy to Vercel by importing the repository and defining the environment variables in the project settings. The `vercel.json` file maps the static homepage and serverless functions automatically. Ensure the Upstash Redis database and Gemini API credentials are available in the deployed environment.

## Contributing

Issues and pull requests are welcome! Please ensure any updates continue to respect the existing Redis key structure (`prompt:YYYY-MM-DD`) so history and sitemap generation remain intact.

## License

MIT License. See [`LICENSE`](LICENSE) if present in this repository, or add one when open-sourcing the project.
