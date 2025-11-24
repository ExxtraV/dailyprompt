import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'get_history') {
            try {
                const prompts = await prisma.prompt.findMany({
                    orderBy: { date: 'desc' }
                });

                const history = prompts.map(p => ({
                    date: p.date,
                    prompt: p.text,
                    theme: p.theme
                }));

                return NextResponse.json(history);
            } catch (dbError) {
                console.error("Database Error (History):", dbError);
                return NextResponse.json([]); // Return empty history on DB failure
            }
        }

        if (action === 'get_today') {
            const todayUTC = new Date().toISOString().split('T')[0];

            // 1. Try to fetch from DB
            try {
                let storedPrompt = await prisma.prompt.findUnique({
                    where: { date: todayUTC }
                });

                if (storedPrompt) {
                    return NextResponse.json({ text: storedPrompt.text });
                }
            } catch (dbError) {
                console.error("Database Error (Fetch Prompt):", dbError);
                // Continue to generate. If DB is down/uninitialized, we can still try to generate and just return the text without saving.
            }

            // 2. Generate via Gemini
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.error("Missing GEMINI_API_KEY");
                // Fallback prompt if API key is missing
                return NextResponse.json({
                    text: "The oracle is sleeping (API Key missing). Please check your configuration. In the meantime: Describe a character realizing they have been wrong about something important for their entire life."
                });
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
                return NextResponse.json({
                    text: "The stars are misaligned (Gemini API Error). Please try again later. In the meantime: Write about a silence that speaks louder than words."
                });
            }

            const result = await geminiResponse.json();
            const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (newPromptText) {
                // 3. Try to save to DB
                try {
                    await prisma.prompt.create({
                        data: {
                            date: todayUTC,
                            text: newPromptText,
                            theme: randomTheme
                        }
                    });
                } catch (saveError) {
                    console.error("Database Save Error:", saveError);
                    // Ignore save error and just return the prompt so the user can write
                }
                return NextResponse.json({ text: newPromptText });
            } else {
                 return NextResponse.json({
                    text: "The oracle spoke, but its words were empty. Please try again."
                });
            }
        }

        return NextResponse.json({ message: 'Invalid action requested.' }, { status: 400 });

    } catch (error) {
        console.error('API Error (Catastrophic):', error);
         return NextResponse.json({
            text: "A connection error occurred. Please check your network or configuration."
        });
    }
}
