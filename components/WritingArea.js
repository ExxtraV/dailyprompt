'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function WritingArea({
    onWordCountChange,
    initialGoal,
    onGoalMet,
    isGoalMet
}) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [dailyGoal, setDailyGoal] = useState(initialGoal || 0);
    const [sprintDuration, setSprintDuration] = useState(5);
    const [sprintEndTime, setSprintEndTime] = useState(null);
    const [sprintStatus, setSprintStatus] = useState('Ready when you are.');
    const [exportStatus, setExportStatus] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved', 'error'
    const sprintIntervalRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Initial load
    useEffect(() => {
        const todayDate = new Date().toISOString().split('T')[0];

        if (session) {
            // Load from Cloud if logged in
            fetch(`/api/draft?date=${todayDate}`)
                .then(res => res.json())
                .then(data => {
                    if (data.text) {
                        setText(data.text);
                        setIsOpen(true);
                    }
                })
                .catch(console.error);
        } else if (typeof window !== 'undefined') {
            // Load from LocalStorage if not logged in
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = `draft-${year}-${month}-${day}`;

            const savedDraft = localStorage.getItem(key);
            if (savedDraft) {
                setText(savedDraft);
                setIsOpen(true);
            }
        }

        if (typeof window !== 'undefined') {
             const storedGoal = localStorage.getItem('dailyWordGoal');
             if (storedGoal) setDailyGoal(parseInt(storedGoal, 10));
        }
    }, [session]);

    // Save draft on change
    useEffect(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const todayDate = d.toISOString().split('T')[0];

        // Always save to local storage as backup
        if (typeof window !== 'undefined') {
             const key = `draft-${dateStr}`;
             localStorage.setItem(key, text);
        }

        if (session) {
            setSaveStatus('unsaved');
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

            saveTimeoutRef.current = setTimeout(async () => {
                setSaveStatus('saving');
                try {
                    const res = await fetch('/api/draft', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: todayDate, text })
                    });
                    if (res.ok) {
                        setSaveStatus('saved');
                    } else {
                        setSaveStatus('error');
                    }
                } catch (e) {
                    setSaveStatus('error');
                }
            }, 1000); // Debounce 1s
        }

        onWordCountChange(getWordCount(text));
    }, [text, session]);

    function getWordCount(str) {
        if (!str) return 0;
        const trimmed = str.trim();
        if (!trimmed) return 0;
        return trimmed.split(/\s+/).length;
    }

    const currentWordCount = getWordCount(text);

    const handleGoalSave = () => {
        if (dailyGoal > 0) {
            localStorage.setItem('dailyWordGoal', dailyGoal.toString());
        } else {
            localStorage.removeItem('dailyWordGoal');
        }
        // Force re-check of goal status
        onWordCountChange(currentWordCount);
    };

    // Sprint Logic
    const startSprint = () => {
        const endTime = Date.now() + sprintDuration * 60 * 1000;
        setSprintEndTime(endTime);
        setSprintStatus(`Time remaining: ${sprintDuration}:00`);

        if (sprintIntervalRef.current) clearInterval(sprintIntervalRef.current);

        sprintIntervalRef.current = setInterval(() => {
            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                setSprintStatus('Sprint complete! Fantastic work.');
                setSprintEndTime(null);
                clearInterval(sprintIntervalRef.current);
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                setSprintStatus(`Time remaining: ${minutes}:${String(seconds).padStart(2, '0')}`);
            }
        }, 1000);
    };

    const stopSprint = () => {
        if (sprintIntervalRef.current) clearInterval(sprintIntervalRef.current);
        setSprintEndTime(null);
        setSprintStatus('Sprint paused. Restart when ready.');
    };

    // Export Logic
    const copyDraft = async () => {
        if (!text) {
            setExportStatus('Nothing to copy yet.');
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            setExportStatus('Draft copied to clipboard!');
            setTimeout(() => setExportStatus(''), 3000);
        } catch (err) {
            setExportStatus('Copy failed.');
        }
    };

    const downloadDraft = () => {
        if (!text) {
            setExportStatus('Nothing to download yet.');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const d = new Date();
        const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        link.href = url;
        link.download = `run-write-${dateKey}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExportStatus('Download ready!');
        setTimeout(() => setExportStatus(''), 3000);
    };

    // Goal Status Text
    const getGoalStatusText = () => {
        if (!dailyGoal || dailyGoal <= 0) return 'No daily goal set.';
        const progress = `${currentWordCount} / ${dailyGoal} words`;
        if (isGoalMet) return `Goal met! ${progress}.`;
        return `Keep going: ${progress}.`;
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="mt-8 w-full flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg shadow transition-transform focus:outline-none focus:ring-4 focus:ring-orange-200 dark:focus:ring-orange-800"
            >
                <span>{isOpen ? 'Close Writing Area' : 'Write Now'}</span>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
            </button>

            {isOpen && (
                <div className="mt-4 space-y-6 bg-orange-50 rounded-lg border border-orange-200 p-4 dark:bg-gray-700 dark:border-gray-600 fade-in">
                     <div className="flex justify-between items-center mb-2">
                        <label htmlFor="writingArea" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Draft your response</label>
                        {session ? (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                {saveStatus === 'saving' && <><Loader2 size={14} className="animate-spin" /> Saving...</>}
                                {saveStatus === 'saved' && <><Cloud size={14} /> Saved to Cloud</>}
                                {saveStatus === 'error' && <><CloudOff size={14} className="text-red-500" /> Save Failed</>}
                                {saveStatus === 'unsaved' && <span className="italic">Unsaved changes...</span>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>Saved locally (Login to sync)</span>
                            </div>
                        )}
                    </div>
                    <textarea
                        id="writingArea"
                        rows="8"
                        className="w-full p-3 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        placeholder="Let the words flow..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    ></textarea>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Word count: <span className="font-semibold">{currentWordCount}</span></p>
                        <p className={`text-sm ${isGoalMet ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {getGoalStatusText()}
                        </p>
                    </div>

                    {/* Goal Setting */}
                    <div className="bg-white rounded-md border border-orange-200 p-4 shadow-sm dark:bg-gray-800 dark:border-gray-600">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Daily word goal</h3>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                type="number"
                                min="0"
                                className="w-full sm:w-40 p-2 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 focus:border-orange-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                                placeholder="e.g. 500"
                                value={dailyGoal || ''}
                                onChange={(e) => setDailyGoal(parseInt(e.target.value) || 0)}
                            />
                            <button onClick={handleGoalSave} className="w-full sm:w-auto bg-orange-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-orange-600 transition">Save goal</button>
                        </div>
                    </div>

                    {/* Sprint */}
                    <div className="bg-white rounded-md border border-orange-200 p-4 shadow-sm dark:bg-gray-800 dark:border-gray-600">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Timed sprint</h3>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <select
                                value={sprintDuration}
                                onChange={(e) => setSprintDuration(parseInt(e.target.value))}
                                disabled={!!sprintEndTime}
                                className="w-full sm:w-40 p-2 border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-400 focus:border-orange-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
                            >
                                <option value="5">5 minutes</option>
                                <option value="10">10 minutes</option>
                                <option value="15">15 minutes</option>
                                <option value="20">20 minutes</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={startSprint}
                                    disabled={!!sprintEndTime}
                                    className="flex-1 bg-gray-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600"
                                >
                                    Start
                                </button>
                                <button
                                    onClick={stopSprint}
                                    disabled={!sprintEndTime}
                                    className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200"
                                >
                                    Stop
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 dark:text-gray-300">{sprintStatus}</p>
                    </div>

                    {/* Export */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Export & Share</h3>
                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <button onClick={copyDraft} className="w-full sm:w-auto bg-gray-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-900 transition dark:bg-orange-500 dark:hover:bg-orange-600">Copy to clipboard</button>
                            <button onClick={downloadDraft} className="w-full sm:w-auto bg-white text-gray-800 font-semibold py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 transition dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">Download .txt</button>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 dark:text-gray-300">{exportStatus}</p>
                    </div>
                </div>
            )}
        </>
    );
}
