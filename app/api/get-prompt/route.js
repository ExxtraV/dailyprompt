import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getEasterDate(year) {
    const f = Math.floor,
        G = year % 19,
        C = f(year / 100),
        H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
        I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
        J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
        L = I - J,
        month = 3 + f((L + 40) / 44),
        day = L + 28 - 31 * f(month / 4);

    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function getHolidayContext(dateString) {
    const date = new Date(dateString);
    const month = date.getUTCMonth() + 1; // 1-12
    const day = date.getUTCDate();
    const year = date.getUTCFullYear();

    // Fixed Holidays
    if (month === 1 && day === 1) return "It is New Year's Day. Incorporate themes of new beginnings, resolutions, or the passage of time.";
    if (month === 2 && day === 14) return "It is Valentine's Day. Incorporate themes of love, affection, or heartbreak.";
    if (month === 3 && day === 17) return "It is St. Patrick's Day. Incorporate themes of luck, folklore, or green.";
    if (month === 10 && day === 31) return "It is Halloween. Incorporate spooky, eerie, or supernatural elements.";
    if (month === 12 && day === 24) return "It is Christmas Eve. Incorporate themes of anticipation, warmth, or winter.";
    if (month === 12 && day === 25) return "It is Christmas Day. Incorporate themes of festivities, family, or winter magic.";
    if (month === 12 && day === 31) return "It is New Year's Eve. Incorporate themes of endings, reflection, or celebration.";

    // Variable Holidays
    // Easter
    if (dateString === getEasterDate(year)) return "It is Easter Sunday. Incorporate themes of rebirth, spring, or hope.";

    // Thanksgiving (USA) - 4th Thursday of November
    if (month === 11) {
        // Nov 1st of that year in UTC
        const firstDay = new Date(Date.UTC(year, 10, 1)).getUTCDay(); // Day of week of Nov 1st (0=Sun)
        // 4th Thursday calculation
        const daysUntilFirstThursday = (4 - firstDay + 7) % 7;
        const thanksgivingDay = 1 + daysUntilFirstThursday + 21;
        if (day === thanksgivingDay) return "It is Thanksgiving. Incorporate themes of gratitude, feast, or gathering.";
    }

    return null;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'get_history') {
            try {
                // Ensure we don't leak future seeded prompts
                const todayUTC = new Date().toISOString().split('T')[0];
                const prompts = await prisma.prompt.findMany({
                    where: { date: { lte: todayUTC } },
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
                "Magical Realism", "Horror", "Romance", "Thriller",
                "Folklore", "Noir", "Solarpunk", "Western", "Gothic"
            ];
            const randomTheme = themes[Math.floor(Math.random() * themes.length)];
            const holidayContext = getHolidayContext(todayUTC);

            let finalPrompt = `Generate a unique, creative, and open-ended writing prompt.
            The primary genre/theme is: ${randomTheme}.
            ${holidayContext ? `IMPORTANT CONTEXT: ${holidayContext}` : ''}

            The prompt should be evocative and inspire a scene, a character, or a story start.

            IMPORTANT GUIDELINES:
            - Be creative and avoid clichés.
            - KEEP IT SHORT: Only 1-2 sentences max.
            - OPEN-ENDED: Allow the writer to decide the specific details.
            - VARIETY: Focus on present action or an immediate situation.
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
