"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        {session.user?.image && (
          <img
            src={session.user.image}
            alt={session.user.name}
            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600"
          />
        )}
        <button
          onClick={() => signOut()}
          className="text-sm font-semibold text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
          aria-label="Sign out"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900 transition-transform transform hover:scale-105"
    >
      <LogIn size={18} />
      Sign In
    </button>
  );
}
