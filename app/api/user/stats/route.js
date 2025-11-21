import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        user: session.user,
        stats: {
            streak: 0,
            totalWords: 0,
            joinDate: new Date().toISOString()
        }
    });
}
