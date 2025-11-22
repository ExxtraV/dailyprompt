'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'users'
    const [feed, setFeed] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Editing State
    const [editingUser, setEditingUser] = useState(null);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'feed') {
                const res = await fetch('/api/community');
                const data = await res.json();
                setFeed(data);
            } else {
                const res = await fetch('/api/admin/users');
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBanToggle = async (userId, currentStatus) => {
        const action = currentStatus ? 'UNBAN' : 'BAN';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            // We use the unified user endpoint now
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isBanned: !currentStatus })
            });

            if (res.ok) {
                alert(`User ${action}NED successfully`);
                fetchData();
            } else {
                const err = await res.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            alert('Failed to update ban status');
        }
    };

    // Legacy handleBan for Feed (uses old endpoint or we should update it?)
    // Let's update it to use the NEW endpoint for consistency.
    const handleBanFromFeed = async (userId) => {
         if (!confirm('Are you sure you want to BAN this user? This will delete all their posts.')) return;
         try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isBanned: true })
            });
            if (res.ok) {
                alert('User banned successfully');
                fetchData();
            } else {
                 const err = await res.json();
                alert(`Error: ${err.message}`);
            }
         } catch (e) { alert('Failed'); }
    };

    const handleDeletePost = async (postId) => {
         if (!confirm('Are you sure you want to DELETE this post?')) return;

         try {
            const res = await fetch('/api/admin/post', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
            });

            if (res.ok) {
                alert('Post deleted successfully');
                fetchData();
            } else {
                const err = await res.json();
                alert(`Error: ${err.message}`);
            }
        } catch (error) {
            alert('Failed to delete post');
        }
    };

    const handleEditName = (user) => {
        setEditingUser(user.id);
        setNewName(user.name);
    };

    const saveName = async (userId) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, name: newName })
            });
            if (res.ok) {
                setEditingUser(null);
                fetchData();
            } else {
                alert('Failed to update name');
            }
        } catch (e) {
            alert('Error updating name');
        }
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-8 font-serif">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-amber-500">Admin Moderation</h1>
                <div className="flex gap-2 bg-stone-900 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`px-4 py-2 rounded-md transition ${activeTab === 'feed' ? 'bg-stone-800 text-white shadow' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        Feed
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-md transition ${activeTab === 'users' ? 'bg-stone-800 text-white shadow' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        Users
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-stone-500 italic">Loading...</div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'feed' && (
                        <div className="grid gap-6">
                            {feed.map((post) => {
                                const postId = `post:${post.id}`;
                                return (
                                    <div key={post.id} className="bg-stone-900 p-6 rounded-lg border border-stone-800 shadow-lg">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                {post.userImage ? (
                                                    <img src={post.userImage} alt={post.userName} className="w-10 h-10 rounded-full border border-stone-700" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-500">?</div>
                                                )}
                                                <div>
                                                    <h3 className="font-semibold text-stone-200">{post.userName}</h3>
                                                    <p className="text-xs text-stone-500">{post.date}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDeletePost(postId)} className="px-3 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded transition-colors">Delete Post</button>
                                                <button onClick={() => handleBanFromFeed(post.userId)} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors font-bold">BAN USER</button>
                                            </div>
                                        </div>
                                        <div className="prose prose-invert max-w-none">
                                            <p className="text-stone-300 whitespace-pre-wrap">{post.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {feed.length === 0 && <p className="text-center text-stone-500 italic">No active posts.</p>}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-stone-900 rounded-lg border border-stone-800 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-stone-950 text-stone-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">User</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-stone-800/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {user.image ? (
                                                        <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-stone-700"></div>
                                                    )}
                                                    <div>
                                                        {editingUser === user.id ? (
                                                            <div className="flex gap-2">
                                                                <input
                                                                    value={newName}
                                                                    onChange={e => setNewName(e.target.value)}
                                                                    className="bg-stone-800 border border-stone-600 px-2 py-1 rounded text-sm text-white"
                                                                />
                                                                <button onClick={() => saveName(user.id)} className="text-green-400 hover:text-green-300 text-xs">Save</button>
                                                                <button onClick={() => setEditingUser(null)} className="text-stone-500 hover:text-stone-400 text-xs">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <div className="font-medium text-stone-200 flex items-center gap-2">
                                                                {user.name}
                                                                <button onClick={() => handleEditName(user)} className="text-stone-500 hover:text-amber-500" title="Edit Name">✎</button>
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-stone-500">{user.email}</div>
                                                        <div className="text-[10px] text-stone-600 font-mono">{user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.isBanned ? (
                                                    <span className="px-2 py-1 text-xs font-bold text-red-100 bg-red-900/50 rounded-full border border-red-900">BANNED</span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs font-bold text-green-100 bg-green-900/50 rounded-full border border-green-900">ACTIVE</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleBanToggle(user.id, user.isBanned)}
                                                    className={`px-3 py-1 text-xs rounded border font-medium transition-colors ${
                                                        user.isBanned
                                                        ? 'bg-stone-800 text-stone-300 border-stone-600 hover:bg-stone-700'
                                                        : 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40'
                                                    }`}
                                                >
                                                    {user.isBanned ? 'Unban User' : 'Ban User'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan="3" className="px-6 py-4 text-center text-stone-500 italic">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
