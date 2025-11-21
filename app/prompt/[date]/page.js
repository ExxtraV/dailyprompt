import { redis } from '@/lib/redis';
import PromptArchiveClient from '@/components/PromptArchiveClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { date } = await params;
    const key = `prompt:${date}`;
    const promptText = await redis.get(key);

    if (!promptText) return { title: 'Prophecy Not Found' };

    return {
        title: `Writing Prompt for ${date} | Run & Write`,
        description: `Creative writing prompt for ${date}: ${promptText.substring(0, 120)}...`,
        openGraph: {
            title: `Writing Prompt for ${date} | Run & Write`,
            description: `${promptText.substring(0, 120)}...`,
            type: 'website',
            url: `https://prompt.run-write.com/prompt/${date}`,
        }
    };
}

export default async function PromptPage({ params }) {
    const { date } = await params;
    const key = `prompt:${date}`;
    const promptText = await redis.get(key);

    if (!promptText) {
        notFound();
    }

    const currentDate = new Date(`${date}T12:00:00Z`);

    const prevDate = new Date(currentDate);
    prevDate.setDate(currentDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // Check if next/prev exist
    const prevPromptExists = await redis.exists(`prompt:${prevDateStr}`);
    const nextPromptExists = await redis.exists(`prompt:${nextDateStr}`);

    return (
        <PromptArchiveClient
            prompt={promptText}
            date={date}
            prevDateStr={prevDateStr}
            nextDateStr={nextDateStr}
            prevPromptExists={prevPromptExists === 1}
            nextPromptExists={nextPromptExists === 1}
        />
    );
}
