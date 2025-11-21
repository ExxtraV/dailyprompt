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
                                    {item.userImage ? (
                                        <img src={item.userImage} alt={item.userName} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center">
                                            <User size={20} className="text-orange-500 dark:text-gray-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{item.userName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Calendar size={12} /> {item.date}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={`/prompt/${item.date}`}
                                    className="text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400"
                                >
                                    View Prompt
                                </Link>
                            </div>

                            <div className="prose dark:prose-invert max-w-none">
                                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {item.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
