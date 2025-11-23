'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';

export default function CommunityPage() {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/community')
            .then(res => res.json())
            .then(data => {
                setFeed(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                        <ArrowLeft size={20} /> Back to Writing
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">Community Feed</h1>
                </div>

                {loading && <div className="text-center py-20">Loading stories...</div>}

                {!loading && feed.length === 0 && (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                        <p className="text-xl text-gray-500 dark:text-gray-400">The library is empty.</p>
                        <p className="mt-2 text-gray-400">Be the first to publish a story!</p>
                    </div>
                )}

                <div className="space-y-6">
                    {feed.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition hover:shadow-xl">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                                <div className="flex items-center gap-3">
                                    {/* User Avatar & Name Link to Profile */}
                                    <Link href={`/profile/${item.userId}`} className="flex items-center gap-3 group">
                                        {item.userImage ? (
                                            <img src={item.userImage} alt={item.userName} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 group-hover:ring-2 ring-orange-500 transition" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center group-hover:ring-2 ring-orange-500 transition">
                                                <User size={20} className="text-orange-500 dark:text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition">{item.userName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <Calendar size={12} /> {item.date}
                                            </p>
                                        </div>
                                    </Link>
                                </div>
                                <Link
                                    href={`/prompt/${item.date}`}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                >
                                    Prompt Context
                                </Link>
                            </div>

                            <div className="prose dark:prose-invert max-w-none relative">
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                                    {item.text}
                                </p>
                                <div className="mt-4">
                                    <Link
                                        href={`/community/${item.id.replace(':', '-')}`} // Ensure safe URL slug if ID has colons
                                        className="inline-flex items-center text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400"
                                    >
                                        Read full story &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
