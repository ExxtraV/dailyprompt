// This is the Vercel version of our secure "temple".
// The code runs on Vercel's servers. The folder name 'api' is crucial.
// Vercel automatically detects files in this folder as serverless functions.

export default async function handler(request, response) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        response.status(405).json({ message: 'Method Not Allowed' });
        return;
    }

    // Pull the secret API key from environment variables.
    // You will set this in the Vercel UI, NOT here.
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    try {
        const { prompt } = request.body;

        if (!prompt) {
            response.status(400).json({ message: 'No prompt provided.' });
            return;
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
            response.status(geminiResponse.status).json({ message: `Gemini API error: ${error.error?.message || 'Unknown error'}` });
            return;
        }

        const result = await geminiResponse.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        response.status(200).json({ text: text });

    } catch (error) {
        console.error('Function Error:', error);
        response.status(500).json({ message: 'An internal error occurred.' });
    }
}
