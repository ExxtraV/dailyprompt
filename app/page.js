'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PromptDisplay from '@/components/PromptDisplay';
import WritingArea from '@/components/WritingArea';
import HistoryModal from '@/components/HistoryModal';
import ThemeToggle from '@/components/ThemeToggle';
import AuthButton from '@/components/AuthButton';

// Force dynamic rendering to ensure the page is served by the server (lambda)
// rather than potentially stale or missing static files on the edge.
export const dynamic = 'force-dynamic';

export default function Home() {
    const [prompt, setPrompt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [streak, setStreak] = useState(0);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [isGoalMet, setIsGoalMet] = useState(false);

    // Fetch Prompt on Load
    useEffect(() => {
        async function fetchPrompt() {
            try {
                const res = await fetch('/api/get-prompt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'get_today'
                    })
                });
                if (!res.ok) throw new Error('Failed to fetch prompt');
                const data = await res.json();
                setPrompt(data.text);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchPrompt();
        loadStreak();
    }, []);

    // Load History when modal opens
    useEffect(() => {
        if (historyOpen && history.length === 0) {
            setHistoryLoading(true);
            fetch('/api/get-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_history' })
            })
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                setHistoryLoading(false);
            })
            .catch(err => {
                setHistoryError(err.message);
                setHistoryLoading(false);
            });
        }
    }, [historyOpen]);

    const loadStreak = () => {
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('writingCompletions');
                const completions = stored ? JSON.parse(stored) : {};
                let currentStreak = 0;
                let cursor = new Date();

                // Check goal met for today
                const todayKey = cursor.toISOString().split('T')[0];
                if (completions[todayKey]?.goalMet) {
                    setIsGoalMet(true);
                }

                // Calculate streak
                while (true) {
                    const key = cursor.toISOString().split('T')[0];
                    if (completions[key] && completions[key].goalMet) {
                        currentStreak += 1;
                        cursor.setDate(cursor.getDate() - 1);
                    } else {
                        break;
                    }
                }
                setStreak(currentStreak);
            } catch (e) {
                console.error("Streak load error", e);
            }
        }
    };

    const handleGoalMet = () => {
        if (!isGoalMet) {
            setIsGoalMet(true);
            const todayKey = new Date().toISOString().split('T')[0];
            const stored = localStorage.getItem('writingCompletions');
            const completions = stored ? JSON.parse(stored) : {};
            completions[todayKey] = { goalMet: true, completedAt: Date.now() };
            localStorage.setItem('writingCompletions', JSON.stringify(completions));
            loadStreak();
        }
    };

    const handleWordCountChange = (count) => {
        const storedGoal = typeof window !== 'undefined' ? localStorage.getItem('dailyWordGoal') : null;
        const goal = storedGoal ? parseInt(storedGoal, 10) : 0;

        if (goal > 0 && count >= goal) {
            handleGoalMet();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
            {/* Top Left: Auth Button */}
            <div className="absolute top-4 left-4 z-10">
                <AuthButton />
            </div>

            {/* Top Right: Theme Toggle */}
            <ThemeToggle />

            <Header streak={streak} />

            <main className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <PromptDisplay prompt={prompt} loading={loading} error={error} />

                <WritingArea
                    onWordCountChange={handleWordCountChange}
                    initialGoal={0}
                    onGoalMet={handleGoalMet}
                    isGoalMet={isGoalMet}
                />

                <div className="text-center mt-6">
                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="bg-gray-700 hover:bg-gray-900 text-white font-bold py-2 px-6 rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
                    >
                        View Prompt Archive
                    </button>
                </div>
            </main>

            <footer className="text-center mt-12 text-gray-500 dark:text-gray-400">
                <p>&copy; 2025 Run & Write. A sanctuary for the written word.</p>
            </footer>

            <HistoryModal
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                history={history}
                loading={historyLoading}
                error={historyError}
            />
        </div>
    );
}
