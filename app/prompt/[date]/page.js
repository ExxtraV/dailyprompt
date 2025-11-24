import { redis } from '@/lib/redis';
import PromptArchiveClient from '@/components/PromptArchiveClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { date } = await params;

    // Check new key first, then fallback
    let promptText = await redis.get(`prompts:${date}`);
    if (!promptText) {
        promptText = await redis.get(`prompt:${date}`);
    }

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

    // Check new key first, then fallback
    let promptText = await redis.get(`prompts:${date}`);
    if (!promptText) {
        promptText = await redis.get(`prompt:${date}`);
    }

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

    // Check if next/prev exist (using new keys mostly, but could check old)
    // We'll check both for existence to be safe during migration
    const [prevNew, prevOld, nextNew, nextOld] = await Promise.all([
        redis.exists(`prompts:${prevDateStr}`),
        redis.exists(`prompt:${prevDateStr}`),
        redis.exists(`prompts:${nextDateStr}`),
        redis.exists(`prompt:${nextDateStr}`)
    ]);

    return (
        <PromptArchiveClient
            prompt={promptText}
            date={date}
            prevDateStr={prevDateStr}
            nextDateStr={nextDateStr}
            prevPromptExists={prevNew === 1 || prevOld === 1}
            nextPromptExists={nextNew === 1 || nextOld === 1}
        />
    );
}
