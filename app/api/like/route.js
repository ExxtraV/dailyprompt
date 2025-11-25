import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkBadges } from '@/lib/gamification';

export async function POST(req) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { postId } = await req.json();
        const userId = session.user.id;

        // Toggle Like
        // Check if exists
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId: userId,
                    postId: postId // Note: This expects the Post's actual ID (CUID), not Slug.
                    // The frontend must send the correct ID.
                }
            }
        });

        // We might need to resolve Slug to ID if the frontend sends Slug
        // But let's assume frontend sends CUID for the 'Like' action to be robust,
        // OR we just resolve it here.
        // Let's resolve it to be safe, assuming postId might be a slug or ID.
        let targetPost = await prisma.post.findUnique({ where: { id: postId } });
        if (!targetPost) {
             targetPost = await prisma.post.findUnique({ where: { slug: postId } });
        }

        if (!targetPost) {
             return NextResponse.json({ message: 'Post not found' }, { status: 404 });
        }

        const realPostId = targetPost.id;
        const postAuthorId = targetPost.userId;

        let liked = false;

        if (existingLike) {
            await prisma.like.delete({
                where: {
                    userId_postId: { userId, postId: realPostId }
                }
            });
        } else {
            // Check if user has already liked? No, `existingLike` checked that.
            // Create like
             // Check if user is trying to like their own post? (Optional, usually allowed or not)
             // User didn't specify, I'll allow it for now as it's common in small apps.
             await prisma.like.create({
                data: {
                    userId: userId,
                    postId: realPostId
                }
             });
             liked = true;
        }

        // --- Gamification Check (Loved Badge) ---
        // Only if a like was ADDED
        if (liked) {
            // Check the Post's like count? No, check the AUTHOR'S max likes on any post.
            // Or is "Loved" per post? The badge says "One of your stories received 10 likes."

            // Get stats for the AUTHOR of the post
            const postLikes = await prisma.like.count({
                where: { postId: realPostId }
            });

            if (postLikes >= 10) { // Threshold
                 // Check if author has badge
                 const hasBadge = await prisma.badge.findUnique({
                     where: {
                         userId_name: {
                             userId: postAuthorId,
                             name: 'loved' // ID in gamification.js is 'loved'
                         }
                     }
                 });

                 if (!hasBadge) {
                     await prisma.badge.create({
                         data: {
                             userId: postAuthorId,
                             name: 'loved'
                         }
                     });
                 }
            }
        }

        // Return updated count
        const newCount = await prisma.like.count({
            where: { postId: realPostId }
        });

        return NextResponse.json({ liked, count: newCount });

    } catch (error) {
        console.error("Like Error:", error);
        return NextResponse.json({ message: 'Error processing like' }, { status: 500 });
    }
}
