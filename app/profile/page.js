'use client';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState({ streak: 0, totalWords: 0, badges: [] });
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [profileUser, setProfileUser] = useState(null);

    useEffect(() => {
        if (session) {
            fetch('/api/user/stats')
                .then(res => res.json())
                .then(data => {
                    if (data.stats) setStats(data.stats);
                    if (data.user) {
                        setProfileUser(data.user);
                        setNewName(data.user.name || '');
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [session]);

    const handleSaveName = async () => {
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (res.ok) {
                setProfileUser({ ...profileUser, name: newName });
                setIsEditing(false);
                // Ideally trigger a session reload, but we rely on our local state for immediate feedback
            } else {
                alert('Failed to update name');
            }
        } catch (e) {
            alert('Error updating name');
        }
    };

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
                        {profileUser?.image && (
                            <img
                                src={profileUser.image}
                                alt={profileUser.name}
                                className="w-24 h-24 rounded-full border-4 border-orange-100 dark:border-gray-700"
                            />
                        )}
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="text-3xl font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full max-w-md"
                                    />
                                    <button onClick={handleSaveName} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><Check size={20}/></button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 bg-red-500 text-white rounded hover:bg-red-600"><X size={20}/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 group">
                                    <h1 className="text-3xl font-black text-gray-900 dark:text-white">{profileUser?.name}</h1>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            )}
                            <p className="text-gray-500 dark:text-gray-400">{profileUser?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Current Streak</h3>
                        <p className="text-4xl font-black text-orange-600 dark:text-orange-500 mt-2">{stats.streak}</p>
                        <p className="text-sm text-gray-400 mt-1">days</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Total Words</h3>
                        <p className="text-4xl font-black text-blue-600 dark:text-blue-500 mt-2">{stats.totalWords}</p>
                        <p className="text-sm text-gray-400 mt-1">written</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
                        <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Badges Earned</h3>
                        <p className="text-4xl font-black text-purple-600 dark:text-purple-500 mt-2">{stats.badges.length}</p>
                        <p className="text-sm text-gray-400 mt-1">trophies</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-6">Achievements</h2>
                    {stats.badges.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {stats.badges.map(badge => (
                                <div key={badge.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center gap-4">
                                    <span className="text-3xl">{badge.icon}</span>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{badge.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg border-dashed border-2 border-gray-200 dark:border-gray-700">
                            <p>Start writing to unlock badges!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
