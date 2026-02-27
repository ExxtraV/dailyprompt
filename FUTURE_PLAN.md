# Run & Write — Future Plan
**Analysis Date:** 2026-02-27
**Codebase:** Next.js 16, Prisma (PostgreSQL), NextAuth, TipTap, Tailwind CSS
**Branch:** `claude/website-planning-analysis-RZ2SG`

> This document compiles reports from four specialist agents who performed a full audit of the Run & Write codebase. It covers bugs & security, feature roadmap, branding strategy, and SEO — with concrete implementation guidance throughout.

---

## Table of Contents

1. [Bug Report & Code Quality](#1-bug-report--code-quality)
2. [Feature Roadmap](#2-feature-roadmap)
3. [Branding Plan](#3-branding-plan)
4. [SEO Strategy](#4-seo-strategy)

---

# 1. Bug Report & Code Quality

## 1.1 Critical Bugs

### BUG-1 — Session callback fires a DB query on every request
**File:** `lib/auth.js` lines 25–38
**Severity:** HIGH — every API request triggers a `prisma.user.findUnique` call.

```js
// Current (bad)
async session({ session, token }) {
  if (session.user) {
    const user = await prisma.user.findUnique({ where: { id: token.sub } });
    ...
  }
}

// Fix — cache user data in the JWT token instead
async jwt({ token, user }) {
  if (user) {
    token.user = { image: user.image, name: user.name, isBanned: user.isBanned };
  }
  return token;
},
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.sub;
    Object.assign(session.user, token.user ?? {});
  }
  return session;
}
```

### BUG-2 — Streak counter lives only in localStorage
**File:** `app/page.js` lines 70–99
**Severity:** MEDIUM — streak is calculated from localStorage only on the client. Multiple tabs or devices will desync. The Prisma `currentStreak` field should be the single source of truth; the client should read from the API.

### BUG-3 — Post can be published without a title
**File:** `app/api/draft/route.js` lines 96–109
**Severity:** MEDIUM — the comment notes "assume frontend handles it." It does not reliably. Add a server-side check:

```js
if (published === true && !title?.trim()) {
  return NextResponse.json({ message: 'Title required to publish' }, { status: 400 });
}
```

### BUG-4 — Slug collision risk
**File:** `app/api/draft/route.js` line 66
**Severity:** MEDIUM — slug is `userId.replace(/[^a-zA-Z0-9]/g, '-')-${date}`. CUID user IDs are safe today, but the sanitization could silently truncate future auth-provider IDs, producing collisions.

### BUG-5 — LikeButton race condition
**File:** `components/LikeButton.js` lines 10–34
**Severity:** LOW — rapid double-clicks flip state incorrectly. Add `isLoading` guard:

```js
const [isLoading, setIsLoading] = useState(false);
const handleLike = async () => {
  if (isLoading) return;
  setIsLoading(true);
  // ... existing logic ...
  setIsLoading(false);
};
```

---

## 1.2 Security Vulnerabilities

### SEC-1 — CRITICAL: Gemini API key exposed in request URL
**File:** `app/api/get-prompt/route.js` line 105

```js
// Current (DANGEROUS — key appears in server logs, error traces, proxies)
const apiUrl = `https://generativelanguage.googleapis.com/...?key=${apiKey}`;

// Fix — use Authorization header or place key in request body per Gemini docs
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
const res = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey,   // Gemini supports this header
  },
  body: JSON.stringify(payload),
});
```

### SEC-2 — DOMPurify too permissive
**Files:** `components/AdminDashboard.js` line 259, `app/community/[slug]/page.js` line 119
Add an explicit allowlist:

```js
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p','br','strong','b','em','i','u','h1','h2','h3','ul','ol','li','blockquote','pre','code'],
  ALLOWED_ATTR: [],
});
```

### SEC-3 — HTML stored unsanitized
**File:** `app/api/draft/route.js` line 69
Sanitize on ingestion (server side) using `sanitize-html`, not only on display. This ensures the DB never holds malicious markup regardless of how the renderer evolves.

### SEC-4 — Admin email check duplicated five times
**Files:** `app/admin/page.js`, `app/api/admin/pin/route.js`, `app/api/admin/post/route.js`, `app/api/admin/users/route.js`, `app/api/admin/seed-prompt/route.js`
Extract to a shared utility:

```js
// lib/admin.js
export function isAdmin(email) {
  const list = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
  return !!email && list.includes(email);
}
```

### SEC-5 — No date/theme input validation on seed-prompt
**File:** `app/api/admin/seed-prompt/route.js` lines 21–25

```js
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  return NextResponse.json({ message: 'Invalid date format' }, { status: 400 });
}
if (!theme?.trim() || theme.trim().length > 100) {
  return NextResponse.json({ message: 'Theme required (max 100 chars)' }, { status: 400 });
}
```

### SEC-6 — No rate limiting on any API route
All `/api/*` routes are unprotected from abuse. Add a simple middleware:

```js
// middleware.js
const limits = {
  '/api/draft':      { max: 10, windowMs: 60_000 },
  '/api/like':       { max: 30, windowMs: 60_000 },
  '/api/get-prompt': { max: 5,  windowMs: 60_000 },
};
// ... apply with in-memory Map or upstash/ratelimit
```

### SEC-7 — Missing HTTP security headers
**File:** `next.config.mjs` — add:

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options',        value: 'DENY' },
      { key: 'X-XSS-Protection',       value: '1; mode=block' },
      { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
    ],
  }];
},
```

### SEC-8 — User-supplied image URL not validated
**File:** `app/api/user/profile/route.js` line 24
Validate that the URL is HTTPS and, optionally, matches a trusted domain allowlist.

---

## 1.3 Performance Issues

| ID | File | Issue | Fix |
|----|------|-------|-----|
| P-1 | `lib/auth.js` | N+1 DB query per session (see BUG-1) | Cache in JWT |
| P-2 | `prisma/schema.prisma` | Missing indexes on `Post.published`, `Post(date,published)`, `User.email` | Add `@@index` entries + migrate |
| P-3 | `app/page.js` | History loads all prompts with no pagination | Add `take`/`cursor` pagination |
| P-4 | Multiple components | `<img>` tags instead of `<Image>` from `next/image` | Swap to `next/image` for automatic optimization |

**Prisma indexes to add:**
```prisma
model User {
  @@index([email])
}
model Post {
  @@index([published])
  @@index([date, published])
}
```

---

## 1.4 Code Quality Issues

| ID | Location | Issue |
|----|----------|-------|
| Q-1 | `app/api/draft/route.js` | Commented-out validation left in — implement or remove |
| Q-2 | Multiple components | No React error boundaries; a component error crashes the entire page |
| Q-3 | Throughout | Hardcoded URLs (`https://www.run-write.com`, `https://prompt.run-write.com`) — use `process.env.NEXT_PUBLIC_APP_URL` |
| Q-4 | `lib/gamification.js` vs `app/api/draft/route.js` | `checkBadges` receives badge names but compares against IDs — verify the contract |
| Q-5 | No TypeScript | Implicit `any` everywhere; consider migrating or adding JSDoc types |
| Q-6 | All API routes | `console.error` used for monitoring — integrate a proper error tracker (Sentry, etc.) |

---

## 1.5 Priority Fix Order

| Priority | ID | Summary |
|----------|----|---------|
| 🔴 Critical | SEC-1 | Rotate Gemini key + fix URL exposure immediately |
| 🔴 Critical | BUG-1/P-1 | Remove per-request DB query in session callback |
| 🟠 High | SEC-3 | Sanitize HTML on ingestion |
| 🟠 High | BUG-3 | Server-side title validation before publish |
| 🟡 Medium | SEC-6 | Rate limiting middleware |
| 🟡 Medium | P-2 | Add Prisma indexes |
| 🟡 Medium | SEC-4 | Extract admin util |
| 🟢 Low | Q-3 | Replace hardcoded URLs |
| 🟢 Low | BUG-5 | LikeButton double-click guard |

---

# 2. Feature Roadmap

## 2.1 Quick Wins (1–2 Weeks)

| Feature | Benefit | Complexity | Priority |
|---------|---------|------------|----------|
| Email notifications for streak breaks | Reduces churn, builds habit | S | 9/10 |
| "Today's Top Stories" home section | Surfaces best content, rewards publishers | S | 8/10 |
| Social share buttons on story cards (Twitter, Bluesky, LinkedIn) | Organic growth | S | 8/10 |
| Weekly streak summary email digest | Progress reinforcement | S | 7/10 |
| Auto-save toast with timestamp | Reduces user anxiety | S | 6/10 |

## 2.2 Short-Term (1–3 Months)

| Feature | Benefit | Complexity | Priority |
|---------|---------|------------|----------|
| Comments on stories | Community feedback loop | M | 8/10 |
| User following system | Social graph, return visits | M | 8/10 |
| Writing prompts by genre/category | Personalization | M | 8/10 |
| Streak leaderboard | Gamified competition | M | 7/10 |
| Story bookmarks / "Read later" | Discovery & retention | M | 7/10 |
| Notification center (bell icon) | Engagement loop | M | 7/10 |
| Advanced search & filtering | Content discovery | M | 7/10 |
| Reading time estimate on cards | UX polish | S | 6/10 |
| Bio + social links on profiles | Personal branding | S | 6/10 |
| Timed writing challenges | Ambitious-user retention | M | 6/10 |

## 2.3 Medium-Term (3–6 Months)

| Feature | Benefit | Complexity | Priority |
|---------|---------|------------|----------|
| Real-time collaborative writing (Yjs + WebSocket) | Unique differentiator | L | 7/10 |
| AI writing assistant / feedback sidebar (Claude/OpenAI) | Skill improvement | L | 7/10 |
| Story collections / portfolios | Curation, time-on-site | M | 7/10 |
| Writing analytics dashboard (`/profile/analytics`) | Data-driven motivation | M | 7/10 |
| Export to PDF / EPUB / Word | Workflow integration | M | 6/10 |
| Organized writing sprints with prizes | Seasonal engagement | M | 6/10 |
| Story remixing (fork another's story with attribution) | Community creativity | M | 5/10 |
| Multiple editor themes (solarized, forest, etc.) | Personalization | M | 4/10 |

## 2.4 Long-Term Vision (6–12 Months)

| Feature | Benefit | Complexity | Priority |
|---------|---------|------------|----------|
| Native mobile app (Expo / React Native) | Expand reach, offline writing | L | 8/10 |
| Writing workshops & paid courses | Revenue + community depth | L | 7/10 |
| Literary magazine / publishing partner integration | Real-world writing pipeline | M | 7/10 |
| AI-powered story recommendations | Personalised discovery | L | 7/10 |
| Multi-language / international communities | Global growth | L | 6/10 |
| Virtual writing sprints with video presence | Social accountability | L | 6/10 |
| Annual "Write & Run Fest" event | Brand moment, retention | M | 6/10 |
| Mentor/mentee matching program | Experienced user retention | M | 5/10 |

## 2.5 Monetization Strategy

| Revenue Stream | Mechanism | Est. Annual Potential |
|----------------|-----------|----------------------|
| **Premium subscription** ($4.99/mo or $39.99/yr) | Unlimited archives, AI assistant, analytics, ad-free, custom exports | $40K+ at 10% conversion of 10K users |
| **Sponsored prompts** | Publishers/brands sponsor a daily prompt | $12K–$72K at 2–3/month |
| **Writing coaching marketplace** | Platform takes 20% of 1:1 sessions | $24K at 50 coaches |
| **Workshops & courses** | 20% commission on creator-sold courses | $40K at 20 courses × 100 students |
| **Enterprise / school plans** ($99–299/mo) | Team writing sprints, custom prompts, cohort admin | $24K–$72K at 20 orgs |
| **Print-on-demand** (personal story books) | $3–5 margin per book | $4K–$6K at 100 books/mo |
| **Tasteful carbon-style ads** | Writer-relevant tools (Grammarly, Scrivener) | $12K–$60K depending on traffic |

## 2.6 Gamification Improvements

**New badge ideas (built on existing system in `lib/gamification.js`):**

| Badge | Condition |
|-------|-----------|
| Genre Master | 10+ stories in the same genre |
| Social Butterfly | 50+ followers |
| Feedback Guru | 50 comments left on others' work |
| Versatile Writer | Stories in 5+ different genres |
| Editor's Eye | Pinned as "Editor's Pick" 3+ times |
| Speed Demon | 1,000 words in a single session |
| Wordsmith Elite | 50,000 total words written |
| Collaborator | 5+ co-written stories |

**XP / leveling system:**
+1 XP per word written, +5 per like received, +10 per story published, +3 per comment → Levels 1–100 with cosmetic unlocks (avatar frames, special title badges).

**Streak grace period** (premium perk): miss 1 day/month without breaking streak.

**Seasonal battle pass** (premium, ~$4.99/season): 50 tiers of cosmetics + XP boosts.

---

# 3. Branding Plan

## 3.1 Brand Identity Analysis

### What's Working
- **Name**: "Run & Write" is memorable, verb–verb parallel structure, implies momentum
- **Color scheme**: Orange + gray is modern, energetic, non-clichéd for a creative tool
- **Gamification**: 🔥 streak counter, word count goals, badges create intrinsic motivation
- **Whimsical copy**: `"Summoning a new prophecy from the ether..."` reveals a distinctive personality — **this is the brand's strongest asset; lean into it everywhere**
- **Frictionless auth**: Google OAuth → write in under 30 seconds

### What's Missing
- No founder/origin story or "About" page
- Footer contains only Terms of Service
- No social media presence or links
- Brand personality limited to the loading copy — rest of the UI is functional but generic
- No newsletter / community-building infrastructure outside the app
- No articulation of what makes Run & Write different from Day One, Ulysses, or NaNoWriMo

## 3.2 Brand Positioning

### Target Audiences

| Persona | Description |
|---------|-------------|
| **Aspiring Daily Writer** (25–45) | Wants consistency, struggles with blank pages, tech-savvy, craves a habit loop |
| **Accountability Seeker** | Uses habit-trackers, wants community and competition, returns for the streak |
| **Creative Professional** | Novelist/screenwriter using prompts as warm-ups before deeper work in Ulysses |

### Competitive Differentiation

| Competitor | Their Strength | Run & Write's Edge |
|------------|---------------|-------------------|
| **Day One** | Beautiful, private journaling for Apple ecosystem | Web-first, community-first, prompt-driven — eliminates the blank page |
| **Ulysses** | Long-form writer's studio | Zero onboarding; gives you the idea instead of assuming you have one |
| **NaNoWriMo** | Massive community, seasonal event | Evergreen (365 days/yr), low-stakes 150-word goal, no registration friction |

### Value Proposition
> *Run & Write transforms casual idea-havers into daily writers by providing a personalized, streak-tracked creative ritual that takes 5 minutes a day.*

### Unique Differentiator: The Prompt Oracle
The core brand promise is **"Daily Inspiration Without Decision Fatigue."** The mysterious loading copy ("Summoning a new prophecy from the ether") is the seed of a distinct brand personality. Build everything around it.

## 3.3 Name & Tagline Options

| Option | Name | Tagline |
|--------|------|---------|
| ⭐ **Recommended** | Run & Write (keep) | "Where Writers Find Their Spark Daily" |
| Alt 1 | Run & Write | "Your Personal Muse, Every Day" |
| Alt 2 | The Daily Prompt | "Your Personal Muse Delivered Daily" |
| Alt 3 | Prompt & Ink | "Daily Prompts, Daily Progress, Daily Wins" |
| Alt 4 | Oracle Daily | "Your Daily Prophecy for Creative Breakthroughs" |

**Recommendation:** Keep "Run & Write". Evolve the tagline from "Your Daily Dose of Creative Inspiration" → **"Where Writers Find Their Spark Daily"**.

## 3.4 Visual Identity

### Color Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Primary | Orange-600 | `#EA580C` | CTAs, streaks, highlights, fire icon |
| Dark BG | Gray-900 | `#111827` | Dark mode background |
| Accent | Indigo-600 | `#4F46E5` | Community / sharing actions |
| Success | Green-600 | `#16A34A` | Goal met, saved, streak active |
| Danger | Red-600 | `#DC2626` | Delete, unpublish, warnings |
| Dark accent | Orange-400 | `#FB923C` | Orange on dark backgrounds (better contrast) |
| Warm dark BG | Gray-800 | `#1F2937` | Soften dark mode for evening writing |

### Typography
- **UI / Microcopy:** Inter (current) — keep. Modern, clean, used by Vercel/Stripe.
- **Editor body text:** Offer an optional serif (Georgia or Garamond) for writers who prefer a literary feel.
- **Scale:** H1 48px/black, H2 20px/bold orange-600, Body 16px/regular, UI labels 14px/medium.

### Logo Concepts

| Concept | Description | Recommendation |
|---------|-------------|----------------|
| The Oracle's Flame | Stylized flame morphing into a pen nib | Good for hero branding |
| **Daily Arc** ⭐ | Circular arc with flame inside, like a progress ring | **Best for app icon + favicon** |
| RW Monogram | Interlocking R+W in orange | Simple, modern lettermark |

**Recommended:** Daily Arc — circular = daily ritual/habit loop; scales down to 16px favicon; can animate as a loading indicator; emoji-adjacent (works beside 🔥).

### Dark / Light Mode Strategy
- Add a **Sepia / Night mode** option for long writing sessions (warm ivory-on-dark-brown)
- Validate all orange/gray combos against WCAG AA (4.5:1 contrast ratio)
- Consider per-session editor themes (distraction-free fullscreen could be near-black/white)

## 3.5 Voice & Tone Guide

### Personality Matrix
- **Warm, whimsical, encouraging, non-judgmental**
- Like: "a friend who believes in your creative potential"
- Unlike: Corporate, patronizing, or precious

### Principles

| Principle | Good | Avoid |
|-----------|------|-------|
| Encouraging, not demanding | "When inspiration strikes, we'll be here." | "GET WRITING NOW!" |
| Poetic, not technical | "Summoning a new prophecy from the ether..." | "Fetching content..." |
| Celebrate progress | "Goal crushed! Streak: 7 days 🔥" | "You missed your goal again." |
| Conversational, not casual | "Ready to write your story?" | "yo fam start writing lol" |

### Microcopy Rewrites

| Location | Current | Recommended |
|----------|---------|-------------|
| Header tagline | "Your Daily Dose of Creative Inspiration" | "Where Writers Find Their Spark Daily" |
| Save state | "Saved" | "Saved to the cloud ✓" |
| Goal met | "Goal met! [progress]" | "Goal crushed! Writing streak: [N] days 🔥" |
| Published | "Published to Community!" | "You're published! Share your spark. 🔥" |
| Nothing copied | "Nothing to copy yet." | "No words yet — let's change that!" |
| Prompt error | "[error]" | "Oops, the oracle is temporarily unavailable. Refresh to try again." |
| Title required | "Title is required to publish." | "Every masterpiece needs a title. What's yours?" |
| Footer copyright | "© 2026 Run & Write. All rights reserved." | "© 2026 Run & Write. Fuel your daily writing ritual." |

## 3.6 Brand Story

### Mission Statement
> **"To spark 1 million daily writers by removing the #1 barrier to writing: deciding what to write."**

### About Page Copy (Draft)
> **About Run & Write**
>
> We're on a mission to prove that anyone can be a daily writer.
>
> Run & Write removes the #1 blocker creative writers face: deciding what to write about. Every day, we generate a fresh, single-paragraph prompt — a spark for your imagination. You get inspiration delivered. We handle the blank page.
>
> Built for writers of all levels — novelists warming up, journalers seeking structure, dreamers discovering their voice — Run & Write makes daily writing a 5-minute ritual. No paywall, no gatekeeping, no judgment.
>
> Track your streak. Set your goal. Write in distraction-free fullscreen. Publish to our community. Watch writers lift writers.
>
> Start your spark today.

### Core Values
1. **Daily Ritual > Occasional Brilliance** — Small, consistent progress beats sporadic genius.
2. **No Judgment, All Creativity** — Every genre, skill level, and voice is welcome.
3. **Speed & Simplicity** — One click to prompt, one click to write, one click to publish.
4. **Community Over Gatekeeping** — Writers lift writers. See others' work. Share yours.

## 3.7 Social Media Strategy

| Platform | Handle | Priority | Content Focus |
|----------|--------|----------|---------------|
| X (Twitter) | `@runandwrite` | Primary | Daily prompt teasers, writer wins, community highlights |
| Instagram | `@runandwrite` | Secondary | Writing desk aesthetics, streak graphics, writer spotlights |
| LinkedIn | `company/run-and-write` | Tertiary | Writing as habit/wellness, corporate writing challenges |
| YouTube | `@RunAndWrite` | Future | Writing sprint videos, writer interviews |

### Content Pillars
- 40% — Daily prompts & inspiration
- 30% — Community story spotlights
- 20% — Writing tips & resources
- 10% — Brand culture & feature updates

### Social Proof Assets to Build
- Shareable streak card: "I've written 47 days straight with Run & Write 🔥 [profile link]"
- "Featured on Run & Write Community" badge
- Monthly "Writer of the Month" with social graphic

## 3.8 Email Marketing

### Newsletter: "The Daily Spark" (bi-weekly)

**Sections:**
1. Hero: Best prompt of the week
2. Community stats: words written, new streaks, stories published
3. Featured writer interview
4. Top community picks (links)
5. One writing tip or feature spotlight
6. CTA: "Start Your Streak Today"

### 7-Day Onboarding Sequence

| Day | Subject | Goal |
|-----|---------|------|
| 0 | "You're In. Your Daily Writing Ritual Starts Now. 🔥" | Welcome + immediate CTA |
| 1 | "Your First Prompt Is Here (3-Min Read)" | First write completion |
| 3 | "How Are Your First 3 Days Going?" | Streak reinforcement |
| 5 | "Join Our Writing Community (No Pressure)" | Community exposure |
| 7 | "Pro Tips to Level Up Your Writing" | Feature education |

**Win-back email (14 days inactive):**
Subject: "Your Streak Might Be Cold 🔥 Let's Reignite It"

## 3.9 Community Culture

### User Recognition Programs

| Program | Description |
|---------|-------------|
| Streak Badges | Bronze (7d), Silver (30d), Gold (100d), Diamond (365d) |
| Monthly Writer of the Month | Algorithm picks top engager; newsletter + social feature |
| Contributor Tiers | Spark Starter (5 posts), Flame Keeper (25), Oracle (100+) |
| Annual Awards | Longest Streak, Most Prolific, Community Favorite, Best Debut |
| Referral Flame | Invite a friend → both unlock limited edition badge |

### Community Guidelines Tone (firm but warm)
> *Run & Write is a safe space for writers. Be kind. Give constructive feedback. No hate, no plagiarism, no spam. Violations result in content removal; repeated violations in account suspension. We're here to celebrate writing — yours and everyone else's.*

---

# 4. SEO Strategy

## 4.1 Current SEO Audit

### Metadata Coverage

| Page | Has Metadata? | Issues |
|------|--------------|--------|
| `/` (Home) | ✅ Yes | Missing OG tags, Twitter cards, canonical |
| `/prompt/[date]` | ✅ Yes | Hardcoded domain (`prompt.run-write.com`), no Twitter card |
| `/community/[slug]` | ✅ Partial | No OG, no Twitter card, no content excerpt in description |
| `/community` | ❌ No | `'use client'` prevents metadata export |
| `/profile/[userId]` | ❌ No | `'use client'` prevents metadata export |
| `/terms` | ✅ Yes | Fine as-is |

### robots.txt — BROKEN
**File:** `public/robots.txt`

Current content is one malformed line mixing prose with directives. This breaks crawler parsing.

```
# Correct robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

Crawl-delay: 1

Sitemap: https://run-write.com/sitemap.xml
```

### Sitemap Issues
**File:** `app/sitemap.js`
- `lastModified: new Date()` on prompts should be `new Date(\`${p.date}T00:00:00Z\`)`
- Banned users and users with no published posts should be excluded
- Hardcoded `baseUrl` should use `process.env.NEXT_PUBLIC_SITE_URL`

## 4.2 Metadata Improvements

### Root Layout (`app/layout.js`)

```js
export const metadata = {
  metadataBase: new URL('https://run-write.com'),
  title: 'Run & Write | Daily Writing Prompts for Creative Writers',
  description: 'Get a free daily writing prompt and join a community of creative writers. Overcome writer\'s block with inspiring prompts, story ideas, and writing challenges.',
  alternates: { canonical: 'https://run-write.com' },
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://run-write.com',
    siteName: 'Run & Write',
    title: 'Run & Write | Daily Writing Prompts for Creative Writers',
    description: 'Free daily writing prompts to spark your creativity.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Run & Write' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Run & Write | Daily Writing Prompts',
    description: 'Free daily writing prompts to overcome writer\'s block.',
    creator: '@runandwrite',
    images: ['/twitter-image.png'],
  },
};
```

### Community Page (`app/community/page.js`)
Extract client-side state into a child component, make the page file a server component, then add:

```js
export const metadata = {
  title: 'Community Stories | Run & Write',
  description: 'Explore inspiring stories from our writing community. Read, like, and share creative writing from writers around the world.',
  openGraph: { type: 'website', url: 'https://run-write.com/community', siteName: 'Run & Write' },
};
```

### Profile Pages (`app/profile/[userId]/page.js`)
Convert to server component (client state in child) + add `generateMetadata`:

```js
export async function generateMetadata({ params }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/users/${params.userId}`, { next: { revalidate: 3600 } });
  if (!res.ok) return { title: 'User Profile | Run & Write' };
  const { user, stats } = await res.json();
  return {
    title: `${user.name}'s Profile | Run & Write`,
    description: `${user.name} has written ${stats.totalWords.toLocaleString()} words on Run & Write.`,
    openGraph: { type: 'profile', images: user.image ? [{ url: user.image }] : [] },
  };
}
```

### Story Pages (`app/community/[slug]/page.js`)
Enhance existing `generateMetadata` with:
- Content excerpt (first 160 chars stripped of HTML) in `description`
- Full `openGraph.article` type with `publishedTime`, `modifiedTime`, `authors`
- `twitter.card: 'summary'`
- Canonical URL

### Prompt Archive (`app/prompt/[date]/page.js`)
Replace hardcoded `prompt.run-write.com` with `process.env.NEXT_PUBLIC_SITE_URL`.

## 4.3 Structured Data (JSON-LD)

### Home — Organization + WebSite
```js
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "name": "Run & Write", "url": "https://run-write.com",
      "sameAs": ["https://twitter.com/runandwrite", "https://instagram.com/runandwrite"] },
    { "@type": "WebSite", "name": "Run & Write", "url": "https://run-write.com",
      "potentialAction": { "@type": "SearchAction",
        "target": "https://run-write.com/community?search={search_term_string}",
        "query-input": "required name=search_term_string" } }
  ]
}
```

### Story pages — Article + BreadcrumbList
```js
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": post.title,
  "datePublished": post.createdAt,
  "dateModified": post.updatedAt,
  "author": { "@type": "Person", "name": post.user.name },
  "publisher": { "@type": "Organization", "name": "Run & Write" },
  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": "https://schema.org/LikeAction",
    "userInteractionCount": post._count.likes
  }
}
```

### Prompt pages — CreativeWork
### Profile pages — Person
### Community feed — CollectionPage + ItemList

*(See detailed schemas in Section 3 of the raw SEO agent report.)*

## 4.4 URL Structure

| Current | Status | Recommendation |
|---------|--------|----------------|
| `/prompt/YYYY-MM-DD` | ✅ Good | Keep; consider `/prompts/all` listing page |
| `/community` | ✅ OK | Consider alias `/stories` (redirect); adds clarity |
| `/community/[slug]` | ✅ Good | Keep descriptive slugs |
| `/profile/[userId]` | ⚠️ ID-based | Parallel `/writers/[username]` for better SEO |
| `/terms` | ✅ Fine | Keep |

## 4.5 Sitemap Improvements

```js
// app/sitemap.js — key changes
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://run-write.com';

// Fix prompt lastModified
lastModified: new Date(`${p.date}T00:00:00Z`),   // was: new Date()

// Filter users to active + non-banned + has published posts
const users = await prisma.user.findMany({
  where: {
    isBanned: false,
    posts: { some: { published: true } },
    lastActive: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  },
  take: 1000,
});
```

## 4.6 Content SEO Strategy

### High-Value Keyword Targets

| Keyword | Monthly Volume | Page |
|---------|---------------|------|
| writing prompts | ~50,000 | Homepage, blog |
| creative writing | ~110,000 | Blog guides |
| daily writing prompts | ~8,100 | Homepage |
| writer's block | ~18,100 | Blog |
| writing inspiration | ~22,200 | Blog |

### Blog Content Plan (`/blog`)

| Post | Target Keywords | Est. Words |
|------|----------------|-----------|
| "50 Writing Prompts for Overcoming Writer's Block" | writing prompts, writer's block | 2,500 |
| "The Complete Guide to Daily Writing Habits" | daily writing, writing routine | 3,000 |
| "Creative Writing Exercises for Every Genre" | creative writing exercises | 2,800 |
| "How to Join an Online Writing Community" | writing community | 1,500 |
| "Best Practices for Writing Short Stories" | short story, story writing | 2,200 |
| "How to Start a Writing Streak (And Keep It)" | writing streak, habit | 1,800 |

### Genre Landing Pages
Create `/prompts/romance`, `/prompts/sci-fi`, `/prompts/horror`, `/prompts/fantasy` with filtered examples + community stories.

## 4.7 Technical SEO

### Core Web Vitals
- Convert `'use client'` pages (community, profile) to server-first + client child components → faster FCP + proper SSR for crawlers
- Replace all `<img>` tags with `next/image` (components: `AuthButton.js`, `community/page.js`, `profile/[userId]/page.js`)
- Add `compress: true` and `optimizeFonts: true` to `next.config.mjs`

### Image Optimization Config
```js
// next.config.mjs
images: {
  remotePatterns: [...],
  formats: ['image/webp', 'image/avif'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
}
```

## 4.8 Internal Linking

| Source Page | Add Links To |
|-------------|-------------|
| Story pages | Prompt that inspired it, author profile, 3 related stories from same date |
| Community feed | Themed prompt archive, top author profiles |
| Profile pages | User's published stories, writing tips by genre |
| Prompt archive | Community stories written from that prompt, next/previous prompt |
| Homepage | Top community stories, latest prompts, trending authors |

## 4.9 SEO Priority Action List

| # | Task | Impact | Effort | ETA |
|---|------|--------|--------|-----|
| 1 | Fix `robots.txt` formatting | HIGH | LOW | 15 min |
| 2 | Replace all hardcoded URLs with env vars | MEDIUM | LOW | 30 min |
| 3 | Add OG + Twitter metadata to root layout | HIGH | LOW | 1 hr |
| 4 | Add metadata to `/community` page | HIGH | LOW | 1–2 hr |
| 5 | Add `generateMetadata` to `/profile/[userId]` | HIGH | MEDIUM | 2–3 hr |
| 6 | Enhance story page metadata (excerpt, OG article) | HIGH | LOW | 1 hr |
| 7 | Fix sitemap (env var, lastModified, user filter) | MEDIUM | MEDIUM | 2–3 hr |
| 8 | Add JSON-LD schema to all key pages | HIGH | MEDIUM | 3–4 hr |
| 9 | Add blog section with 3 pillar posts | HIGH | HIGH | 2–3 wk |
| 10 | Internal linking (stories ↔ prompts ↔ authors) | MEDIUM | MEDIUM | 3–4 hr |

---

# Appendix: Implementation Phases

## Phase 1 — Foundations (Weeks 1–4)
**Goal:** Eliminate critical bugs, ship security fixes, lay SEO groundwork.

- [ ] Rotate & secure Gemini API key (SEC-1)
- [ ] Cache user data in JWT to eliminate N+1 query (BUG-1)
- [ ] Add server-side publish validation (BUG-3)
- [ ] Fix `robots.txt` (SEO #1)
- [ ] Add OG + Twitter metadata to root layout (SEO #3)
- [ ] Add metadata to `/community` and `/profile` pages (SEO #4, #5)
- [ ] Replace hardcoded URLs with env vars (Q-3, SEO #2)
- [ ] Add security headers to `next.config.mjs` (SEC-7)
- [ ] Sanitize HTML on ingestion (SEC-3)
- [ ] Extract admin email utility (SEC-4)
- [ ] Launch Twitter & Instagram accounts
- [ ] Write About page with brand story

## Phase 2 — Community (Months 2–4)
**Goal:** Deepen engagement, build social graph.

- [ ] Comments on stories
- [ ] User following system
- [ ] Notification center
- [ ] Genre/category filtering
- [ ] Weekly streak digest email
- [ ] Streak leaderboard
- [ ] Shareable streak card
- [ ] Blog section with 3 SEO pillar posts
- [ ] JSON-LD schema on all key pages
- [ ] "Writer of the Month" program

## Phase 3 — Monetization & Growth (Months 4–6)
**Goal:** Revenue, sustainable growth.

- [ ] Premium subscription tier (unlimited archives, AI assistant, advanced analytics)
- [ ] Story bookmarks
- [ ] Writing analytics dashboard
- [ ] Export to PDF/EPUB/Word
- [ ] Sponsored prompts
- [ ] Organized writing sprints with prizes
- [ ] Genre landing pages for SEO
- [ ] Expanded badge system + XP leveling

## Phase 4 — Platform Scale (Months 6–12)
**Goal:** Major product bets.

- [ ] Real-time collaborative writing
- [ ] AI writing assistant sidebar
- [ ] Mobile app (Expo)
- [ ] Workshop & course marketplace
- [ ] Publishing partner integrations
- [ ] Multi-language communities
- [ ] Annual "Write & Run Fest" event

---

*Generated by a 4-agent analysis team on 2026-02-27.*
*Agents: Bug Hunter · Product Manager · Brand Strategist · SEO Specialist*
