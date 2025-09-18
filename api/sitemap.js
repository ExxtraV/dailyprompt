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

