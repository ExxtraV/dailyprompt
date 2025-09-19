// We are using the Upstash guild's own magic directly.
import { Redis } from '@upstash/redis';

// This is the Grand Scribe. Its chamber is named with square brackets,
// a Vercel spell that allows it to respond to any request that matches the pattern.
// A request to /prompt/2025-09-20 will summon this spirit.

const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});

// A small helper to format dates consistently.
/**
 * Formats a JavaScript Date object into a 'YYYY-MM-DD' string.
 * @param {Date} date The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Handles requests for viewing a prompt from a specific date.
 * This function is a Vercel dynamic route that captures the date from the URL.
 * It fetches the corresponding prompt from Redis. If found, it constructs and
 * serves an HTML page displaying the prompt, along with navigation to the
 * previous and next day's prompts if they exist. It also includes social media
 * sharing buttons and metadata for SEO.
 *
 * @param {import('http').IncomingMessage} request The Vercel serverless function request object,
 *   containing the date in the `query` property.
 * @param {import('http').ServerResponse} response The Vercel serverless function response object used to
 *   send back the HTML page or an error.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 */
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

        // --- The Art of the Chronomancer (Now with Foresight!) ---
        const currentDate = new Date(`${date}T12:00:00Z`); // Use midday to avoid timezone shifts
        
        const prevDate = new Date(currentDate);
        prevDate.setDate(currentDate.getDate() - 1);
        const prevDateStr = formatDate(prevDate);

        const nextDate = new Date(currentDate);
        nextDate.setDate(currentDate.getDate() + 1);
        const nextDateStr = formatDate(nextDate);
        
        // --- THE NEW WISDOM ---
        // Before drawing a path to the past, the Scribe now checks if a scroll exists for that day.
        const prevPromptExists = await redis.get(`prompt:${prevDateStr}`);
        
        const today = new Date();
        const isNextDateInFuture = nextDate > today;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Writing Prompt for ${date} | Run & Write</title>
                <meta name="description" content="Creative writing prompt for ${date}: ${promptText.substring(0, 120)}...">
                
                <!-- The Social Sigils -->
                <meta property="og:title" content="Writing Prompt for ${date} | Run & Write" />
                <meta property="og:description" content="${promptText.substring(0, 120)}..." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://prompt.run-write.com/prompt/${date}" />

                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style> 
                    body { font-family: 'Inter', sans-serif; } 
                    .btn-icon { width: 1.25rem; height: 1.25rem; }
                </style>
            </head>
            <body class="bg-gray-50 text-gray-800 flex flex-col items-center justify-center min-h-screen p-4">
                <main class="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center">
                    <p class="text-sm font-semibold text-orange-600">A Prophecy From The Archives</p>
                    <h1 class="text-3xl font-black text-gray-900 mt-2">Writing Prompt: ${date}</h1>
                    <div id="prompt" class="mt-8 text-3xl text-gray-800 leading-relaxed font-semibold">
                        <p>${promptText}</p>
                    </div>
                    
                    <div class="mt-8 flex justify-center items-center gap-3">
                        <button id="copyBtn" class="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition">
                            <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            <span id="copyBtnText">Copy</span>
                        </button>
                        <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(`Writing prompt: "${promptText}"`)}&url=${encodeURIComponent(`https://prompt.run-write.com/prompt/${date}`)}" target="_blank" class="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition">
                             <svg class="btn-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616v.064c0 2.298 1.636 4.22 3.803 4.659-.564.153-1.156.22-1.756.186.618 1.953 2.423 3.377 4.564 3.417-1.77 1.39-3.995 2.226-6.417 2.023C.62 20.32 0 20.07 0 19.75c2.057 1.313 4.545 2.08 7.24 2.08 8.441 0 13.065-6.992 12.8-12.875.922-.665 1.71-1.49 2.34-2.438z"></path></svg>
                            <span>Share</span>
                        </a>
                    </div>
                </main>

                <nav class="w-full max-w-2xl mt-4 flex justify-between items-center">
                    ${prevPromptExists ? `
                    <a href="/prompt/${prevDateStr}" class="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-md border border-gray-200">
                        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Previous Prophecy
                    </a>
                    ` : `<div></div>`}
                    
                    ${!isNextDateInFuture ? `
                    <a href="/prompt/${nextDateStr}" class="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-md border border-gray-200">
                        Next Prophecy
                        <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </a>
                    ` : `<div></div>`}
                </nav>
                <a href="/" class="inline-block mt-8 text-gray-500 hover:text-gray-800 font-semibold hover:underline">
                    &larr; Back to the Oracle
                </a>

                <script>
                    const copyBtn = document.getElementById('copyBtn');
                    const copyBtnText = document.getElementById('copyBtnText');
                    const promptText = document.getElementById('prompt').innerText;

                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(promptText).then(() => {
                            copyBtnText.textContent = 'Copied!';
                            copyBtn.classList.add('bg-green-200');
                            setTimeout(() => {
                                copyBtnText.textContent = 'Copy';
                                copyBtn.classList.remove('bg-green-200');
                            }, 2000);
                        }).catch(err => {
                            copyBtnText.textContent = 'Failed';
                            console.error('Failed to copy text: ', err);
                        });
                    });
                </script>
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

