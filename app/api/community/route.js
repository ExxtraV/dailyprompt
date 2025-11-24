import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const posts = await prisma.post.findMany({
            where: {
                published: true
            },
            orderBy: {
                createdAt: 'desc' // or date? redis code used 'score' which was timestamp.
            },
            take: 20,
            include: {
                user: {
                    select: {
                        name: true,
                        image: true,
                        id: true
                    }
                }
            }
        });

        // Format to match the expected frontend structure
        const feed = posts.map(post => ({
            id: post.slug, // Use slug as ID for linking
            userId: post.userId,
            userName: post.user.name || 'Anonymous',
            userImage: post.user.image,
            date: post.date,
            text: post.content,
            publishedAt: post.createdAt.getTime()
        }));

        return NextResponse.json(feed);
    } catch (error) {
        console.error("Community Feed Error:", error);
        return NextResponse.json([], { status: 500 });
    }
}
