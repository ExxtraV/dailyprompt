// We are using the Upstash guild's own magic directly.
import { Redis } from '@upstash/redis';

// This is the messenger for the First Pilgrim. It is the only spirit
// that WRITES new prophecies to the Great Library.

const redis = new Redis({
  url: process.env.MANUAL_UPSTASH_URL,
  token: process.env.MANUAL_UPSTASH_TOKEN,
});

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { action, prompt } = request.body;

    try {
        if (action === 'get_history') {
            // --- The Librarian's Duty ---
            const keys = await redis.keys('prompt:*');
            if (keys.length === 0) {
                return response.status(200).json([]);
            }
            const prompts = await redis.mget(...keys);
            
            const history = keys.map((key, index) => ({
                date: key.replace('prompt:', ''),
                prompt: prompts[index]
            })).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

            return response.status(200).json(history);
        }

        if (action === 'get_today') {
            // --- The Scribe's Duty ---
            const todayUTC = new Date().toISOString().split('T')[0];
            const key = `prompt:${todayUTC}`;

            let storedPrompt = await redis.get(key);

            if (storedPrompt) {
                return response.status(200).json({ text: storedPrompt });
            }
            
            // --- The Oracle's Plea ---
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('The oracle is unreachable. The secret key to its chamber is missing.');
            }

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const payload = { contents: [{ parts: [{ text: prompt }] }] };

            const geminiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!geminiResponse.ok) {
                const error = await geminiResponse.json();
                throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
            }

            const result = await geminiResponse.json();
            const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (newPromptText) {
                // --- THE RUNE OF FADING IS BANISHED ---
                // The `{ ex: 86400 }` clause has been removed. The prophecy is now permanent.
                await redis.set(key, newPromptText);
                return response.status(200).json({ text: newPromptText });
            } else {
                throw new Error('The oracle spoke, but its words were empty.');
            }
        }

        return response.status(400).json({ message: 'Invalid action requested.' });

    } catch (error) {
        console.error('API Error:', error);
        return response.status(500).json({ message: 'A catastrophic error occurred in the temple.', detail: error.message });
    }
}

