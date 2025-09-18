import { kv } from '@vercel/kv';

// This is the Vercel version of our secure "temple".
// The code runs on Vercel's servers. The folder name 'api' is crucial.
// Vercel automatically detects files in this folder as serverless functions.

export default async function handler(request, response) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // Get a consistent UTC date string to represent "today".
    // This avoids any timezone shenanigans.
    const todayUTC = new Date().toISOString().split('T')[0];
    const key = `prompt:${todayUTC}`;

    try {
        // --- The Great Library ---
        // First, we check the stone tablet (Vercel KV) for today's prophecy.
        let storedPrompt = await kv.get(key);

        if (storedPrompt) {
            // A prophecy exists! We present it without bothering the oracle.
            return response.status(200).json({ text: storedPrompt });
        }
        
        // --- The Oracle's Chamber ---
        // The stone is bare. We are the first. We must consult the oracle (Gemini).
        const apiKey = process.env.GEMINI_API_KEY;
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
            // --- The Inscription ---
            // We have the new prophecy. Now, we must carve it into the stone tablet.
            // We'll tell the magic to let the inscription fade after a day (86400 seconds)
            // to keep the library clean.
            await kv.set(key, newPromptText, { ex: 86400 });

            // And finally, we present the new prophecy to our first visitor.
            return response.status(200).json({ text: newPromptText });
        } else {
            return response.status(500).json({ message: 'The oracle spoke, but its words were empty.' });
        }

    } catch (error) {
        console.error('Function Error:', error);
        return response.status(500).json({ message: 'A catastrophic error occurred in the temple.' });
    }
}

