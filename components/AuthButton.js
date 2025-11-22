"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, User, Globe } from "lucide-react";
import Link from 'next/link';
import { useState } from 'react';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (status === "loading") {
    return <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
  }

  if (session) {
    return (
      <div className="relative">
        <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 focus:outline-none"
        >
            {session.user?.image ? (
            <img
                src={session.user.image}
                alt={session.user.name}
                className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:border-orange-400 transition"
            />
            ) : (
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                    {session.user?.name?.charAt(0) || 'U'}
                </div>
            )}
        </button>

        {isOpen && (
            <div className="absolute top-12 left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{session.user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
                </div>
                <Link
                    href="/community"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={() => setIsOpen(false)}
                >
                    <Globe size={16} />
                    Community Feed
                </Link>
                <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    onClick={() => setIsOpen(false)}
                >
                    <User size={16} />
                    Profile & Stats
                </Link>
                <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
        <Link
            href="/community"
            className="text-sm font-semibold text-gray-600 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400 hidden sm:block"
        >
            Community
        </Link>
        <button
        onClick={() => signIn("google")}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-transform transform hover:scale-105"
        >
        <LogIn size={18} />
        Sign In
        </button>
    </div>
  );
}
