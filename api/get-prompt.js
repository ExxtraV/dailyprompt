// We are now importing the Upstash guild's own magic directly.
import { Redis } from '@upstash/redis';

// This is the Vercel version of our secure "temple".
// The code runs on Vercel's servers. The folder name 'api' is crucial.
// Vercel automatically detects files in this folder as serverless functions.

// --- The Hidden Path ---
// We create a new, direct connection to the library, bypassing the faulty @vercel/kv spirit.
const redis = new Redis({
  url: process.env.KV_URL,
  token: process.env.KV_REST_API_TOKEN,
});


export default async function handler(request, response) {
    console.log('--- Using Direct Upstash Connection ---');
    console.log('Function started. Method:', request.method); 

    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const todayUTC = new Date().toISOString().split('T')[0];
    const key = `prompt:${todayUTC}`;
    console.log('Today\'s key:', key); 

    try {
        console.log('Checking KV for stored prompt via direct connection...');
        // We now use our 'redis' connection, not the old 'kv' spirit.
        let storedPrompt = await redis.get(key);
        console.log('Direct check complete. Found prompt:', !!storedPrompt);

        if (storedPrompt) {
            return response.status(200).json({ text: storedPrompt });
        }
        
        console.log('No prompt found. Consulting the Gemini oracle.');
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error('CRITICAL: GEMINI_API_KEY environment variable is not set.');
            return response.status(500).json({ message: 'The oracle is unreachable. The secret key to its chamber is missing.' });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const { prompt } = request.body;
        if (!prompt) {
            return response.status(400).json({ message: 'No prompt text provided.' });
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
            console.error('Gemini API Error:', error);
            return response.status(geminiResponse.status).json({ message: `Gemini API error: ${error.error?.message || 'Unknown error'}` });
        }

        const result = await geminiResponse.json();
        const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (newPromptText) {
            console.log('New prompt generated. Storing in KV via direct connection...');
            // We use our 'redis' connection to write the new prophecy.
            await redis.set(key, newPromptText, { ex: 86400 });
            console.log('Storage complete. Sending response to user.');
            return response.status(200).json({ text: newPromptText });
        } else {
            return response.status(500).json({ message: 'The oracle spoke, but its words were empty.' });
        }

    } catch (error) {
        console.error('Function Error (catch block):', error);
        return response.status(500).json({ message: 'A catastrophic error occurred in the temple.', detail: error.message });
    }
}

