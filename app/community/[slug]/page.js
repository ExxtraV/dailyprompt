import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, User } from 'lucide-react';
import { notFound } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import DOMPurify from 'isomorphic-dompurify';

export async function generateMetadata({ params }) {
    const { slug } = await params;

    const post = await prisma.post.findUnique({
        where: { slug: slug },
        include: { user: true }
    });

    if (!post) return { title: 'Story Not Found' };

    return {
        title: `${post.user.name || 'Anonymous'}'s Story | Run & Write`,
        description: `Read a response to the prompt from ${post.date}.`
    };
}

export default async function StoryPage({ params }) {
    const { slug } = await params;

    const post = await prisma.post.findUnique({
        where: { slug: slug },
        include: {
            user: true
        }
    });

    if (!post) {
        notFound();
    }

    const prompt = await prisma.prompt.findUnique({
        where: { date: post.date }
    });
    const promptText = prompt ? prompt.text : "Prompt archive unavailable.";

    // Helper to detect if content is HTML-ish. Simple check, but practical for this migration.
    const isHtml = post.content.trim().startsWith('<');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8 relative">
             <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>
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
                            {promptText}
                        </p>
                    </div>

                    {/* Story Content */}
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-6">
                            {/* Link to User Profile */}
                            <Link href={`/profile/${post.userId}`} className="flex items-center gap-4 group">
                                {post.user.image ? (
                                    <img
                                        src={post.user.image}
                                        alt={post.user.name}
                                        className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-600 group-hover:ring-2 ring-orange-500 transition"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center group-hover:ring-2 ring-orange-500 transition">
                                        <User size={24} className="text-orange-500 dark:text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition">{post.user.name || 'Anonymous'}</h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Published on {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </Link>
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-300 leading-relaxed text-lg">
                            {isHtml ? (
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
                            ) : (
                                <p className="whitespace-pre-wrap">
                                    {post.content}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
