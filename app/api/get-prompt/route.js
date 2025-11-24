import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'get_history') {
            const prompts = await prisma.prompt.findMany({
                orderBy: { date: 'desc' }
            });

            const history = prompts.map(p => ({
                date: p.date,
                prompt: p.text,
                theme: p.theme
            }));

            return NextResponse.json(history);
        }

        if (action === 'get_today') {
            const todayUTC = new Date().toISOString().split('T')[0];

            // Check if a prompt already exists for today
            let storedPrompt = await prisma.prompt.findUnique({
                where: { date: todayUTC }
            });

            if (storedPrompt) {
                return NextResponse.json({ text: storedPrompt.text });
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

            // Enhanced system prompt to ensure variety and reduce repetition
            const finalPrompt = `Generate a unique and creative writing prompt for a creative writer.
            The theme for today is: ${randomTheme}.
            The prompt should be evocative, open-ended, and suitable for any genre within that theme.
            It should inspire a scene, a character, or a story.

            IMPORTANT GUIDELINES:
            - Be creative and avoid clichés.
            - Do NOT use common tropes like finding a mysterious key, a hidden door, or a music box unless you twist it significantly.
            - Ensure the prompt is distinct from typical generic prompts.
            - It should only be 2-3 sentences.
            - Do not return formatting (no markdown, no bold text).`;

            const payload = {
                contents: [{ parts: [{ text: finalPrompt }] }],
                generationConfig: {
                    temperature: 1.0 // High temperature for variety
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
                await prisma.prompt.create({
                    data: {
                        date: todayUTC,
                        text: newPromptText,
                        theme: randomTheme
                    }
                });
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
