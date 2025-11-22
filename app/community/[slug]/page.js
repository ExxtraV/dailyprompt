import { redis } from '@/lib/redis';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { slug } = await params;
    // Slug format: userId:date. However, userId might contain weird chars.
    // The previous feed ID logic was: `${userId}-${date}` in draft route?
    // Let's check draft/route.js.
    // `const feedItem = { id: `${userId}-${date}`, ... }`
    // Wait, `userId` from Google might not be URL safe? (e.g. sub keys).
    // But usually they are numeric or safe strings.
    // However, if I passed `user:123:date`, Next.js dynamic route handles it?
    // The URL would be `/community/user:123:2023-10-10`. Colon is safe-ish.

    // Let's assume slug is the ID.
    // But we need to parse it to find the post Key.
    // Post Key: `post:${userId}:${date}`.
    // If ID is `${userId}-${date}`, we need to split it.
    // BUT userId might contain hyphens?
    // Google IDs are usually numeric.
    // Let's try to reverse engineer or just store the key in the ID?
    // Or, simpler: fetch the feed item from `post:{slug}`?
    // Wait, the ID used in `community:feed` was `${userId}-${date}` (hyphen separated).
    // But the KEY used for KV storage was `post:${userId}:${date}` (colon separated).

    // If we click the link `/community/some-id`, we need to find the post.
    // Problem: splitting by hyphen is ambiguous if userId has hyphens.
    // Solution: We should probably fix the ID generation to be more robust or parse carefully.
    // Assumption: Date is always YYYY-MM-DD (fixed length 10).
    // So we can split from the right?

    const datePart = slug.slice(-10);
    const userIdPart = slug.slice(0, -11); // Remove -YYYY-MM-DD

    // This relies on the ID format being `${userId}-${date}`.
    // Let's try to fetch `post:${userIdPart}:${datePart}`.
    const postKey = `post:${userIdPart}:${datePart}`;
    const post = await redis.get(postKey);

    if (!post) return { title: 'Story Not Found' };

    return {
        title: `${post.userName}'s Story | Run & Write`,
        description: `Read a response to the prompt from ${post.date}.`
    };
}

export default async function StoryPage({ params }) {
    const { slug } = await params;
    const datePart = slug.slice(-10);
    const userIdPart = slug.slice(0, -11);
    const postKey = `post:${userIdPart}:${datePart}`;
    const promptKey = `prompt:${datePart}`;

    const [post, promptText] = await Promise.all([
        redis.get(postKey),
        redis.get(promptKey)
    ]);

    if (!post) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8">
            <div className="max-w-3xl mx-auto">
                <Link href="/community" className="inline-flex items-center gap-2 mb-8 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                    <ArrowLeft size={20} /> Back to Feed
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Prompt Context Header */}
                    <div className="bg-orange-50 dark:bg-gray-700/50 p-6 border-b border-orange-100 dark:border-gray-600">
                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-2">
                            Prompt for {post.date}
                        </p>
                        <p className="text-lg font-medium text-gray-800 dark:text-gray-200 italic">
                            {promptText || "Prompt archive unavailable."}
                        </p>
                    </div>

                    {/* Story Content */}
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            {post.userImage ? (
                                <img src={post.userImage} alt={post.userName} className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-600" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                                    <User size={24} className="text-orange-500 dark:text-gray-400" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{post.userName}</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Published on {new Date(post.publishedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="prose dark:prose-invert max-w-none">
                            <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-300 leading-relaxed text-lg">
                                {post.text}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
