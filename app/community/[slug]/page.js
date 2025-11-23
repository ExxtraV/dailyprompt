import { redis } from '@/lib/redis';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const { slug } = await params;

    // Parse Slug (Format: userId-date, where date is last 10 chars YYYY-MM-DD)
    const datePart = slug.slice(-10);
    const userIdPart = slug.slice(0, -11);

    // Check New Key
    let post = await redis.get(`posts:${userIdPart}:${datePart}`);

    // Check Old Key (Fallback)
    if (!post) {
        post = await redis.get(`post:${userIdPart}:${datePart}`);
    }

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

    // Keys
    const newPostKey = `posts:${userIdPart}:${datePart}`;
    const oldPostKey = `post:${userIdPart}:${datePart}`;

    const newPromptKey = `prompts:${datePart}`;
    const oldPromptKey = `prompt:${datePart}`;

    // Fetch Data (Parallel lookup for efficiency, though we might fetch duplicates)
    // We check new keys first.
    const [newPost, oldPost, newPrompt, oldPrompt] = await Promise.all([
        redis.get(newPostKey),
        redis.get(oldPostKey),
        redis.get(newPromptKey),
        redis.get(oldPromptKey)
    ]);

    const post = newPost || oldPost;
    const promptText = newPrompt || oldPrompt;

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
                            {/* Link to User Profile */}
                            <Link href={`/profile/${post.userId}`} className="flex items-center gap-4 group">
                                {post.userImage ? (
                                    <img
                                        src={post.userImage}
                                        alt={post.userName}
                                        className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-600 group-hover:ring-2 ring-orange-500 transition"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center group-hover:ring-2 ring-orange-500 transition">
                                        <User size={24} className="text-orange-500 dark:text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition">{post.userName}</h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Published on {new Date(post.publishedAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
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
