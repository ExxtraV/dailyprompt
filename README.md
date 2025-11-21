# Run & Write – Daily Prompt Oracle

Run & Write is a lightweight Next.js application that serves a daily creative writing prompt. It uses a modern stack to provide a fast, responsive, and persistent writing experience.

## Features

- **Daily prompt generator** – Calls the Gemini API with a templated instruction to produce a single paragraph prompt that is cached for 24 hours.
- **Prompt history & archives** – Stores prompts in Redis using `prompt:YYYY-MM-DD` keys, exposes an archive modal, and provides permanent `/prompt/[date]` pages for each stored prompt.
- **Sitemap generation** – Builds an XML sitemap from Redis keys so search engines can index the archive.
- **Persistent Writing Area** – Your current draft is saved to your browser's local storage so you never lose your work.
- **Gamification** – Track your daily writing streaks and set word count goals.
- **Dark Mode** – A fully responsive dark mode that respects system preferences and user choice.

## Project Structure

```
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # Serverless API routes (Prompt generation)
│   │   ├── prompt/[date]/ # Dynamic archive pages
│   │   ├── page.js        # Main landing page
│   │   └── layout.js      # Root layout & global styles
│   ├── components/        # Reusable React components (WritingArea, Header, etc.)
│   └── lib/               # Shared utilities (Redis client)
├── public/                # Static assets (robots.txt, images)
├── package.json           # Dependencies (Next.js, React, Tailwind, Upstash Redis)
├── tailwind.config.js     # Tailwind CSS configuration
└── next.config.mjs        # Next.js configuration
```

## Prerequisites

- Node.js 18 or newer.
- An [Upstash Redis](https://upstash.com/) database for prompt storage.
- A Google Gemini API key with access to the `gemini-2.0-flash` model.

## Environment Variables

Create a `.env.local` file for local development or configure these variables in your Vercel deployment:

| Variable | Description |
| --- | --- |
| `MANUAL_UPSTASH_URL` | Upstash Redis REST URL. |
| `MANUAL_UPSTASH_TOKEN` | Upstash Redis REST token. |
| `GEMINI_API_KEY` | Google Gemini API key used to generate new prompts. |

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

3. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Deployment

Deploy to Vercel by importing the repository. Next.js is automatically detected. Ensure the environment variables are set in the Vercel project settings.

## Contributing

Issues and pull requests are welcome! Please ensure any updates continue to respect the existing Redis key structure (`prompt:YYYY-MM-DD`) so history and sitemap generation remain intact.

## License

MIT License.
