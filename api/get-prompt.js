// We are using the Upstash guild's own magic directly.
import { Redis } from '@upstash/redis';

// --- THE MANUAL OVERRIDE ---
// The Vercel KV integration is failing us. We are now bypassing it entirely.
// This function will now look for MANUALLY created environment variables.
// This is the most robust and direct path to the library.
const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});


export default async function handler(request, response) {
    // A quick check to ensure the new keys are present.
    if (!process.env.MANUAL_UPSTASH_URL || !process.env.MANUAL_UPSTASH_TOKEN) {
        console.error('CRITICAL: Manual Upstash environment variables are not set.');
        return response.status(500).json({ message: 'The temple\'s manual connection to the Great Library is not configured.' });
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- The Two Paths ---
    // We now check for an 'action' in the request to decide which spell to cast.
    const { action, prompt } = request.body;

    if (action === 'get_history') {
        try {
            console.log('--- History Request Received ---');
            // Fetch all keys matching the pattern 'prompt:*'
            const keys = await redis.keys('prompt:*');

            if (!keys || keys.length === 0) {
                return response.status(200).json([]); // Return an empty array if no history exists
            }

            // Fetch all the values for the found keys in a single command
            const prompts = await redis.mget(...keys);
            
            // Combine the keys (dates) and values (prompts) into a structured array
            const history = keys.map((key, index) => ({
                date: key.replace('prompt:', ''),
                prompt: prompts[index]
            }))
            // Sort the history so the newest prompts appear first
            .sort((a, b) => new Date(b.date) - new Date(a.date));

            return response.status(200).json(history);

        } catch (error) {
            console.error('History Fetch Error:', error);
            return response.status(500).json({ message: 'Failed to retrieve prompt history from the Great Library.', detail: error.message });
        }
    }


    // --- The Original Path (get_today) ---
    // If no action or 'get_today' is specified, we perform the original ritual.
    const todayUTC = new Date().toISOString().split('T')[0];
    const key = `prompt:${todayUTC}`;

    try {
        let storedPrompt = await redis.get(key);

        if (storedPrompt) {
            return response.status(200).json({ text: storedPrompt });
        }
        
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return response.status(500).json({ message: 'The oracle is unreachable. The secret key to its chamber is missing.' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        if (!prompt) {
            return response.status(400).json({ message: 'No prompt text provided for the oracle.' });
        }

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            return response.status(geminiResponse.status).json({ message: `Gemini API error: ${error.error?.message || 'Unknown error'}` });
        }

        const result = await geminiResponse.json();
        const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (newPromptText) {
            await redis.set(key, newPromptText, { ex: 86400 });
            return response.status(200).json({ text: newPromptText });
        } else {
            return response.status(500).json({ message: 'The oracle spoke, but its words were empty.' });
        }

    } catch (error) {
        console.error('Function Error (catch block):', error);
        return response.status(500).json({ message: 'A catastrophic error occurred in the temple.', detail: error.message });
    }
}

