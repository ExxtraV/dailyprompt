// We are using the Upstash guild's own magic directly.
import { Redis } from '@upstash/redis';

// This new spirit, the Master Cartographer, is tasked with creating a map
// of our entire temple grounds for the search engine spiders to follow.

const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});

// The true domain of your temple, as you have declared it.
const YOUR_DOMAIN = 'https://prompt.run-write.com';

/**
 * Generates and serves an XML sitemap for the application.
 * This function fetches all keys from Redis that match the 'prompt:*' pattern,
 * which represent historical prompts. It then maps these keys to permanent URLs
 * based on their date. The resulting list of URLs is formatted into a standard
 * XML sitemap, including a URL for the root of the domain.
 *
 * It requires `MANUAL_UPSTASH_URL` and `MANUAL_UPSTASH_TOKEN` environment variables to be set.
 * The `YOUR_DOMAIN` constant should be configured to the application's public domain.
 *
 * @param {import('http').IncomingMessage} request The Vercel serverless function request object.
 * @param {import('http').ServerResponse} response The Vercel serverless function response object used to
 *   send back the XML sitemap or a JSON error.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 */
export default async function handler(request, response) {
    try {
        const keys = await redis.keys('prompt:*');

        const urls = keys.map(key => {
            const date = key.replace('prompt:', '');
            // Each prophecy gets its own permanent address (a "permalink")
            return `<url><loc>${YOUR_DOMAIN}/prompt/${date}</loc></url>`;
        });

        // The sitemap is an XML scroll, written in a language the spiders understand.
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${YOUR_DOMAIN}/</loc>
    </url>
    ${urls.join('')}
</urlset>`;

        // We present the map as a formal XML document.
        response.setHeader('Content-Type', 'application/xml');
        response.status(200).send(sitemap);

    } catch (error)
 {
        console.error('Sitemap Generation Error:', error);
        response.status(500).json({ message: 'The Master Cartographer failed to draw the map.' });
    }
}

