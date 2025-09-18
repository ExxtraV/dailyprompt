import { kv } from '@vercel/kv';

// This is the Vercel version of our secure "temple".
// The code runs on Vercel's servers. The folder name 'api' is crucial.
// Vercel automatically detects files in this folder as serverless functions.

export default async function handler(request, response) {
    // --- The Truth Serum ---
    // We will now log the environment variables the function ACTUALLY sees.
    // This is the most important diagnostic step.
    console.log('--- Environment Variable Scrying ---');
    console.log('Does the function see the KV_URL?', !!process.env.KV_URL);
    console.log('Does the function see the KV_REST_API_TOKEN?', !!process.env.KV_REST_API_TOKEN);
    console.log('Does the function see the GEMINI_API_KEY?', !!process.env.GEMINI_API_KEY);
    console.log('--- End of Scrying ---');

    console.log('Function started. Method:', request.method); // Log entry

    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const todayUTC = new Date().toISOString().split('T')[0];
    const key = `prompt:${todayUTC}`;
    console.log('Today\'s key:', key); // Log the key

    try {
        console.log('Checking Vercel KV for stored prompt...');
        let storedPrompt = await kv.get(key);
        console.log('KV check complete. Found prompt:', !!storedPrompt);

        if (storedPrompt) {
            return response.status(200).json({ text: storedPrompt });
        }
        
        console.log('No prompt found in KV. Consulting the Gemini oracle.');
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error('CRITICAL: GEMINI_API_KEY environment variable is not set.');
            return response.status(500).json({ message: 'The oracle is unreachable. The secret key to its chamber is missing.' });
        }

        console.log('API Key found. Preparing to call Gemini API.');
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const { prompt } = request.body;
        if (!prompt) {
            console.error('Request body did not contain a prompt.');
            return response.status(400).json({ message: 'No prompt text provided.' });
        }

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        console.log('Sending request to Gemini...');
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log('Received response from Gemini. Status:', geminiResponse.status);

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            console.error('Gemini API Error:', error);
            return response.status(geminiResponse.status).json({ message: `Gemini API error: ${error.error?.message || 'Unknown error'}` });
        }

        const result = await geminiResponse.json();
        const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (newPromptText) {
            console.log('New prompt generated. Storing in Vercel KV...');
            await kv.set(key, newPromptText, { ex: 86400 });
            console.log('Storage complete. Sending response to user.');
            return response.status(200).json({ text: newPromptText });
        } else {
            console.error('Gemini response was successful, but contained no text.');
            return response.status(500).json({ message: 'The oracle spoke, but its words were empty.' });
        }

    } catch (error) {
        console.error('Function Error (catch block):', error);
        return response.status(500).json({ message: 'A catastrophic error occurred in the temple.', detail: error.message });
    }
}

