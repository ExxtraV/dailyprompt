import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
    // 1. Auth Check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const adminEmails = process.env.ADMIN_EMAILS || '';
    const admins = adminEmails.split(',').map(e => e.trim());
    if (!admins.includes(session.user.email)) {
         return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { date, theme } = body;

        if (!date || !theme) {
            return NextResponse.json({ message: 'Date and Theme are required' }, { status: 400 });
        }

        // 2. Generate via Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ message: 'Gemini API Key missing' }, { status: 500 });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const promptInstruction = `Generate a unique and creative writing prompt for a creative writer.
        The specific theme/topic requested is: ${theme}.
        The prompt should be evocative, open-ended, and suitable for any genre within that theme.
        It should inspire a scene, a character, or a story.

        IMPORTANT GUIDELINES:
        - Be creative and avoid clichés.
        - Ensure the prompt is distinct.
        - It should only be 1-2 sentences.
        - Do not return formatting (no markdown, no bold text).`;

        const payload = {
            contents: [{ parts: [{ text: promptInstruction }] }],
            generationConfig: {
                temperature: 1.0 // High creativity
            }
        };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const error = await geminiResponse.json();
            console.error("Gemini API Error (Seeding):", error);
            return NextResponse.json({ message: 'Failed to generate prompt from Gemini' }, { status: 502 });
        }

        const result = await geminiResponse.json();
        const newPromptText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!newPromptText) {
             return NextResponse.json({ message: 'Gemini returned empty response' }, { status: 502 });
        }

        // 3. Save to DB (Upsert)
        const prompt = await prisma.prompt.upsert({
            where: { date: date },
            update: {
                text: newPromptText,
                theme: theme
            },
            create: {
                date: date,
                text: newPromptText,
                theme: theme
            }
        });

        return NextResponse.json({ message: 'Prompt scheduled successfully', prompt });

    } catch (error) {
        console.error('Seeding Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
