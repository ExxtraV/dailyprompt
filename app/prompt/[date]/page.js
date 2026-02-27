import { prisma } from '@/lib/prisma';
import PromptArchiveClient from '@/components/PromptArchiveClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { date } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://prompt.run-write.com';

    const prompt = await prisma.prompt.findUnique({
        where: { date: date }
    });

    if (!prompt) return { title: 'Prophecy Not Found', robots: 'noindex' };

    const preview = prompt.text.substring(0, 155);

    return {
        title: `Writing Prompt for ${date} | Run & Write`,
        description: `Daily writing prompt for ${date}: "${preview}..."`,
        alternates: { canonical: `${baseUrl}/prompt/${date}` },
        openGraph: {
            title: `Writing Prompt for ${date} | Run & Write`,
            description: preview,
            type: 'website',
            url: `${baseUrl}/prompt/${date}`,
            siteName: 'Run & Write',
        },
        twitter: {
            card: 'summary',
            title: `Writing Prompt — ${date}`,
            description: preview,
        },
    };
}

export default async function PromptPage({ params }) {
    const { date } = await params;

    const prompt = await prisma.prompt.findUnique({
        where: { date: date }
    });

    if (!prompt) {
        notFound();
    }

    const currentDate = new Date(`${date}T12:00:00Z`);

    const prevDate = new Date(currentDate);
    prevDate.setDate(currentDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Check if next/prev exist in the database
    const [prevPrompt, nextPrompt] = await Promise.all([
        prisma.prompt.findUnique({ where: { date: prevDateStr }, select: { id: true } }),
        prisma.prompt.findUnique({ where: { date: nextDateStr }, select: { id: true } })
    ]);

    return (
        <PromptArchiveClient
            prompt={prompt.text}
            date={date}
            prevDateStr={prevDateStr}
            nextDateStr={nextDateStr}
            prevPromptExists={!!prevPrompt}
            nextPromptExists={!!nextPrompt}
        />
    );
}
