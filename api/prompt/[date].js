// We are using the Upstash guild's own magic directly.
import { Redis } from '@upstash/redis';

// This is the Grand Scribe. Its chamber is named with square brackets,
// a Vercel spell that allows it to respond to any request that matches the pattern.
// A request to /prompt/2025-09-20 will summon this spirit.

const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});

export default async function handler(request, response) {
    // The Scribe reads the date from the address of the request.
    const { date } = request.query;
    const key = `prompt:${date}`;

    try {
        const promptText = await redis.get(key);

        if (!promptText) {
            // If the scroll for that day does not exist, we say so.
            return response.status(404).send('<h1>404 - Prophecy Not Found</h1><p>The scroll for this day is missing from the Great Library.</p>');
        }

        // --- The Art of Server-Side Rendering ---
        // The Scribe now crafts a complete HTML document on the server.
        // This is a perfect, static page that search engine spiders can read instantly.
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Writing Prompt for ${date} | Run & Write</title>
                <meta name="description" content="Creative writing prompt for ${date}: ${promptText.substring(0, 120)}...">
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style> body { font-family: 'Inter', sans-serif; } </style>
            </head>
            <body class="bg-gray-50 text-gray-800 flex items-center justify-center min-h-screen p-4">
                <main class="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center">
                    <p class="text-sm font-semibold text-orange-600">A Prophecy From The Archives</p>
                    <h1 class="text-3xl font-black text-gray-900 mt-2">Writing Prompt: ${date}</h1>
                    <div class="mt-6 min-h-[100px] flex items-center justify-center p-4 bg-orange-50 rounded-lg">
                        <p class="text-2xl text-gray-700 leading-relaxed">${promptText}</p>
                    </div>
                    <a href="/" class="inline-block mt-8 bg-gray-700 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105">
                        &larr; Back to the Oracle
                    </a>
                </main>
            </body>
            </html>
        `;
        
        response.setHeader('Content-Type', 'text/html');
        response.status(200).send(html);

    } catch (error) {
        console.error('Prompt Page Error:', error);
        return response.status(500).send('<h1>500 - The Scribe has fainted</h1><p>An error occurred while transcribing the prophecy.</p>');
    }
}
