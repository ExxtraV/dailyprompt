# Run & Write – Daily Prompt Oracle

Run & Write is a lightweight Next.js application that serves a daily creative writing prompt. It uses a modern stack to provide a fast, responsive, and persistent writing experience.

## Features

- **Daily prompt generator** – Calls the Gemini API with a templated instruction to produce a single paragraph prompt that is cached for 24 hours.
- **User Accounts** – Sign in with Google to save your writing sessions (powered by NextAuth.js).
- **Prompt history & archives** – Stores prompts in Redis using `prompt:YYYY-MM-DD` keys, exposes an archive modal, and provides permanent `/prompt/[date]` pages for each stored prompt.
- **Sitemap generation** – Builds an XML sitemap from Redis keys so search engines can index the archive.
- **Persistent Writing Area** – Your current draft is saved to your browser's local storage (and soon the cloud!) so you never lose your work.
- **Gamification** – Track your daily writing streaks and set word count goals.
- **Dark Mode** – A fully responsive dark mode that respects system preferences and user choice.

## Project Structure

```
├── app/               # Next.js App Router
│   ├── api/           # Serverless API routes (Prompt generation, Auth)
│   ├── prompt/[date]/ # Dynamic archive pages
│   ├── page.js        # Main landing page
│   └── layout.js      # Root layout & global styles
├── components/        # Reusable React components (WritingArea, Header, AuthButton, etc.)
├── lib/               # Shared utilities (Redis client)
├── public/            # Static assets (robots.txt, images)
├── package.json       # Dependencies (Next.js, React, Tailwind, Upstash Redis, NextAuth)
└── next.config.mjs    # Next.js configuration
```

## Prerequisites

- Node.js 18 or newer.
- An [Upstash Redis](https://upstash.com/) database.
- A Google Gemini API key.
- A Google Cloud Project with OAuth credentials.

## Environment Variables

Create a `.env.local` file for local development or configure these variables in your Vercel deployment:

| Variable | Description |
| --- | --- |
| `MANUAL_UPSTASH_URL` | Upstash Redis REST URL. |
| `MANUAL_UPSTASH_TOKEN` | Upstash Redis REST token. |
| `GEMINI_API_KEY` | Google Gemini API key used to generate new prompts. |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Google Cloud Console. |
| `NEXTAUTH_SECRET` | A random string used to encrypt tokens (generate with `openssl rand -base64 32`). |
| `NEXTAUTH_URL` | The canonical URL of your site (e.g., `http://localhost:3000` or `https://your-app.vercel.app`). |

### Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Select **Web application**.
6. Add Authorized Redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-app.vercel.app/api/auth/callback/google`
7. Copy the Client ID and Secret to your environment variables.

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deployment

Deploy to Vercel by importing the repository. Next.js is automatically detected. Ensure all environment variables are set in the Vercel project settings.

## License

MIT License.
