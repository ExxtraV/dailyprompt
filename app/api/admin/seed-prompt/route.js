import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
    // 1. Auth Check
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { date, theme } = body;

        if (!date || !theme) {
            return NextResponse.json({ message: 'Date and Theme are required' }, { status: 400 });
        }

        // 2. Generate via Claude
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ message: 'Anthropic API Key missing' }, { status: 500 });
        }

        const anthropic = new Anthropic({ apiKey });

        const promptInstruction = `Generate a unique and creative writing prompt for a creative writer.
        The specific theme/topic requested is: ${theme}.
        The prompt should be evocative, open-ended, and suitable for any genre within that theme.
        It should inspire a scene, a character, or a story.

        IMPORTANT GUIDELINES:
        - Be creative and avoid clichés.
        - Ensure the prompt is distinct.
        - It should only be 1-2 sentences.
        - Do not return formatting (no markdown, no bold text).`;

        let claudeResponse;
        try {
            claudeResponse = await anthropic.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 256,
                messages: [{ role: 'user', content: promptInstruction }],
            });
        } catch (apiError) {
            console.error("Claude API Error (Seeding):", apiError);
            return NextResponse.json({ message: 'Failed to generate prompt from Claude' }, { status: 502 });
        }

        const newPromptText = claudeResponse.content?.[0]?.type === 'text'
            ? claudeResponse.content[0].text
            : null;

        if (!newPromptText) {
            return NextResponse.json({ message: 'Claude returned empty response' }, { status: 502 });
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
