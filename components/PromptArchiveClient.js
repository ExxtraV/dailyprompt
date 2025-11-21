'use client';
import { useState } from 'react';
import { Copy, Check, Share2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function PromptArchiveClient({ prompt, date, prevDateStr, nextDateStr, prevPromptExists, nextPromptExists }) {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(prompt).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
             <main className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 border border-gray-200 text-center dark:bg-gray-800 dark:border-gray-700">
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-500">A Prophecy From The Archives</p>
                <h1 className="text-3xl font-black text-gray-900 mt-2 dark:text-gray-100">Writing Prompt: {date}</h1>
                <div id="prompt" className="mt-8 text-3xl text-gray-800 leading-relaxed font-semibold dark:text-gray-300">
                    <p>{prompt}</p>
                </div>

                <div className="mt-8 flex justify-center items-center gap-3">
                    <button
                        onClick={copyToClipboard}
                        className={`flex items-center gap-2 font-semibold py-2 px-4 rounded-lg transition ${copied ? 'bg-green-200 text-green-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Writing prompt: "${prompt}"`)}&url=${encodeURIComponent(`https://prompt.run-write.com/prompt/${date}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-400 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                        <Share2 size={20} />
                        <span>Share</span>
                    </a>
                </div>
            </main>

            <nav className="w-full max-w-2xl mt-4 flex justify-between items-center">
                {prevPromptExists ? (
                    <Link href={`/prompt/${prevDateStr}`} className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-md border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700">
                        <ChevronLeft size={20} />
                        Previous Prophecy
                    </Link>
                ) : <div />}

                {nextPromptExists ? (
                    <Link href={`/prompt/${nextDateStr}`} className="flex items-center gap-2 bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 shadow-md border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700">
                        Next Prophecy
                        <ChevronRight size={20} />
                    </Link>
                ) : <div />}
            </nav>

            <Link href="/" className="inline-flex items-center gap-2 mt-8 text-gray-500 hover:text-gray-800 font-semibold hover:underline dark:text-gray-400 dark:hover:text-gray-200">
                <ArrowLeft size={20} /> Back to the Oracle
            </Link>
        </div>
    );
}
