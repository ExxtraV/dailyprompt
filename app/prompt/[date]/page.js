import { prisma } from '@/lib/prisma';
import PromptArchiveClient from '@/components/PromptArchiveClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { date } = await params;

    const prompt = await prisma.prompt.findUnique({
        where: { date: date }
    });

    if (!prompt) return { title: 'Prophecy Not Found' };

    return {
        title: `Writing Prompt for ${date} | Run & Write`,
        description: `Creative writing prompt for ${date}: ${prompt.text.substring(0, 120)}...`,
        openGraph: {
            title: `Writing Prompt for ${date} | Run & Write`,
            description: `${prompt.text.substring(0, 120)}...`,
            type: 'website',
            url: `https://prompt.run-write.com/prompt/${date}`,
        }
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
