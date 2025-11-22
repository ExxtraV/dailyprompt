import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redis } from '@/lib/redis';
import { updateUserDisplayName, banUser, unbanUser } from '@/lib/user';

function isAdmin(email) {
    const adminEmails = process.env.ADMIN_EMAILS || '';
    const admins = adminEmails.split(',').map(e => e.trim());
    return admins.includes(email);
}

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Scan for users
    // Assuming we don't have millions yet.
    const users = [];
    let cursor = 0;
    const profileKeys = [];

    do {
        const [newCursor, keys] = await redis.scan(cursor, { match: 'user:*', count: 100 });
        cursor = newCursor;

        // Filter for just profile keys: user:{id} (no colons)
        // OR user:email:... (NextAuth uses these too)
        // NextAuth keys:
        // user:{id} -> The profile object
        // user:email:{email} -> ID mapping
        // session:{token}
        // account:{provider}:{id}

        // We want user:{id}. ID is usually a UUID (36 chars) or CUID (25 chars).
        // We check if split(':').length === 2

        for (const key of keys) {
            const parts = key.split(':');
            if (parts.length === 2 && parts[0] === 'user' && parts[1] !== 'email' && parts[1] !== 'session') {
                profileKeys.push(key);
            }
        }
    } while (cursor !== 0 && cursor !== '0');

    if (profileKeys.length > 0) {
        // MGET all profiles
        const profiles = await redis.mget(...profileKeys);

        // Check Banned Status for each
        // We can use pipeline
        const pipeline = redis.pipeline();
        profileKeys.forEach(key => {
            pipeline.get(`${key}:banned`);
        });
        const bannedStatuses = await pipeline.exec();

        profileKeys.forEach((key, index) => {
            const profile = profiles[index];
            if (profile && typeof profile === 'object') {
                const status = bannedStatuses[index];
                // Robust check for string 'true' or boolean true
                const isBanned = String(status) === 'true';

                users.push({
                    id: key.split(':')[1],
                    name: profile.name,
                    email: profile.email,
                    image: profile.image,
                    isBanned: isBanned
                });
            }
        });
    }

    return NextResponse.json(users);
}

export async function PATCH(request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !isAdmin(session.user.email)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, name, isBanned } = body;

    if (!userId) {
        return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    // Handle Name Change
    if (name !== undefined) {
        await updateUserDisplayName(userId, name);
    }

    // Handle Ban Status
    if (isBanned !== undefined) {
        if (isBanned === true) {
            await banUser(userId);
        } else {
            await unbanUser(userId);
        }
    }

    return NextResponse.json({ success: true });
}
