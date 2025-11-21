import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { redis } from '@/lib/redis';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ message: 'Date required' }, { status: 400 });
    }

    const key = `user:${session.user.id}:draft:${date}`;
    const draft = await redis.get(key);

    return NextResponse.json({ text: draft || '' });
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, text } = body;

    if (!date || text === undefined) {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const key = `user:${session.user.id}:draft:${date}`;

    // Save draft
    await redis.set(key, text);

    // Update total word count stat (incremental approximation or re-calc)
    // For accurate stats, we might just store the raw text and calc on fly,
    // or store a separate counter. Let's store a separate counter for "Total Words Written"
    // This is complex because we overwrite drafts.
    // Simplified approach for now: Just save the draft.
    // We will handle complex stats in the "Complete" action or just sum drafts later.

    return NextResponse.json({ success: true });
}
