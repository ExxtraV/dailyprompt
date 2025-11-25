import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const currentUserId = session?.user?.id;

        const posts = await prisma.post.findMany({
            where: {
                published: true
            },
            orderBy: [
                { pinType: 'asc' }, // "announcement" < "favorite" < "none"
                { createdAt: 'desc' }
            ],
            take: 20,
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                        id: true
                    }
                },
                _count: {
                    select: { likes: true }
                },
                likes: currentUserId ? {
                    where: { userId: currentUserId },
                    select: { userId: true }
                } : false
            }
        });

        // Format to match the expected frontend structure
        const feed = posts.map(post => ({
            id: post.slug, // Use slug as ID for linking
            realId: post.id, // Real ID for API actions like Like
            userId: post.userId,
            userName: post.user.name || 'Anonymous',
            userImage: post.user.image,
            date: post.date,
            title: post.title || 'Untitled Story',
            text: post.content,
            publishedAt: post.createdAt.getTime(),
            pinType: post.pinType,
            likes: post._count.likes,
            isLiked: currentUserId ? post.likes.length > 0 : false
        }));

        return NextResponse.json(feed);
    } catch (error) {
        console.error("Community Feed Error:", error);
        return NextResponse.json([], { status: 500 });
    }
}
