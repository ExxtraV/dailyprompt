'use client';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (status === "unauthenticated") {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-8">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 mb-8 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition">
                    <ArrowLeft size={20} /> Back to Writing
                </Link>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 mb-8">
                    <div className="flex items-center gap-6">
                        {session?.user?.image && (
                            <img
                                src={session.user.image}
                                alt={session.user.name}
                                className="w-24 h-24 rounded-full border-4 border-orange-100 dark:border-gray-700"
                            />
                        )}
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white">{session?.user?.name}</h1>
                            <p className="text-gray-500 dark:text-gray-400">{session?.user?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Current Streak</h3>
                        <p className="text-4xl font-black text-orange-600 dark:text-orange-500 mt-2">0</p>
                        <p className="text-sm text-gray-400 mt-1">days</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Total Words</h3>
                        <p className="text-4xl font-black text-blue-600 dark:text-blue-500 mt-2">0</p>
                        <p className="text-sm text-gray-400 mt-1">written</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Badges Earned</h3>
                        <p className="text-4xl font-black text-purple-600 dark:text-purple-500 mt-2">0</p>
                        <p className="text-sm text-gray-400 mt-1">trophies</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-6">Achievements</h2>
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg border-dashed border-2 border-gray-200 dark:border-gray-700">
                        <p>Start writing to unlock badges!</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
