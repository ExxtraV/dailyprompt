import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request) {
    try {
        const body = await request.json();
        const { action, prompt } = body;

        if (action === 'get_history') {
            const keys = await redis.keys('prompts:*');
            if (keys.length === 0) {
                return NextResponse.json([]);
            }
            const prompts = await redis.mget(...keys);

            const history = keys.map((key, index) => ({
                date: key.replace('prompts:', ''),
                prompt: prompts[index]
            })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return NextResponse.json(history);
        }

        if (action === 'get_today') {
            const todayUTC = new Date().toISOString().split('T')[0];
            const key = `prompts:${todayUTC}`;

            let storedPrompt = await redis.get(key);

            if (storedPrompt) {
                return NextResponse.json({ text: storedPrompt });
            }

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ message: 'The oracle is unreachable. The secret key to its chamber is missing.' }, { status: 500 });
            }

            // Using the user-specified model: gemini-2.0-flash
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const themes = [
                "Mystery", "Sci-Fi", "Nature", "Emotional", "Urban",
                "Historical", "Fantasy", "Slice of Life", "Surrealism",
                "Dystopian", "Adventure", "Philosophical", "Cyberpunk",
                "Magical Realism", "Horror", "Romance", "Thriller"
            ];
            const randomTheme = themes[Math.floor(Math.random() * themes.length)];

            const finalPrompt = `Generate a creative writing prompt for a creative writer.
            The theme for today is: ${randomTheme}.
            The prompt should be evocative, open-ended, and suitable for any genre within that theme.
            It should inspire a scene, a character, or a story.
            Be creative and avoid clichés.
            It should only be 2-3 sentences, do not return formatting.`;

            const payload = {
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: {
                    temperature: 1.0
                }
            };

            const geminiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!geminiResponse.ok) {
                const error = await geminiResponse.json();
                console.error("Gemini API Error:", error);
                return NextResponse.json({ message: `Gemini API error: ${error.error?.message || 'Unknown error'}` }, { status: 502 });
            }

            const result = await geminiResponse.json();
            const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (newPromptText) {
                await redis.set(key, newPromptText);
                return NextResponse.json({ text: newPromptText });
            } else {
                return NextResponse.json({ message: 'The oracle spoke, but its words were empty.' }, { status: 500 });
            }
        }

        return NextResponse.json({ message: 'Invalid action requested.' }, { status: 400 });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ message: 'A catastrophic error occurred in the temple.', detail: error.message }, { status: 500 });
    }
}
