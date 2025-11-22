'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Cloud, CloudOff, Loader2, Globe, XCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function WritingArea({
    onWordCountChange,
    initialGoal,
    onGoalMet,
    isGoalMet,
    date
}) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [dailyGoal, setDailyGoal] = useState(initialGoal || 0);
    const [sprintDuration, setSprintDuration] = useState(5);
    const [sprintEndTime, setSprintEndTime] = useState(null);
    const [sprintStatus, setSprintStatus] = useState('Ready when you are.');
    const [exportStatus, setExportStatus] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved');
    const [isPublished, setIsPublished] = useState(false);
    const sprintIntervalRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    const activeDate = date || new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (session) {
            fetch(`/api/draft?date=${activeDate}`)
                .then(res => res.json())
                .then(data => {
                    if (data.text) {
                        setText(data.text);
                        setIsOpen(true);
                    }
                    if (data.published) {
                        setIsPublished(true);
                    }
                })
                .catch(console.error);
        } else if (typeof window !== 'undefined') {
            const key = `draft-${activeDate}`;
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
    }, [session, activeDate]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
             const key = `draft-${activeDate}`;
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
                        body: JSON.stringify({ date: activeDate, text }) // Auto-save doesn't touch published state
                    });
                    if (res.ok) {
                        setSaveStatus('saved');
                    } else {
                        setSaveStatus('error');
                    }
                } catch (e) {
                    setSaveStatus('error');
                }
            }, 1000);
        }

        onWordCountChange(getWordCount(text));
    }, [text, session, activeDate]);

    const handlePublish = async () => {
        if (!session) return;
        setSaveStatus('saving');
        try {
            const res = await fetch('/api/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: activeDate, text, published: true })
            });
            if (res.ok) {
                setSaveStatus('saved');
                setIsPublished(true);
                setExportStatus('Published to Community!');
                setTimeout(() => setExportStatus(''), 3000);
            }
        } catch (e) {
            setSaveStatus('error');
        }
    };

    const handleUnpublish = async () => {
        if (!session) return;
        setSaveStatus('saving');
        try {
            const res = await fetch('/api/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: activeDate, text, published: false })
            });
            if (res.ok) {
                setSaveStatus('saved');
                setIsPublished(false);
                setExportStatus('Unpublished from Community.');
                setTimeout(() => setExportStatus(''), 3000);
            }
        } catch (e) {
            setSaveStatus('error');
        }
    };

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
        onWordCountChange(currentWordCount);
    };

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
        link.href = url;
        link.download = `run-write-${activeDate}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExportStatus('Download ready!');
        setTimeout(() => setExportStatus(''), 3000);
    };

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
                <div className="mt-4 space-y-6 bg-orange-50 rounded-lg border border-orange-200 p-4 dark:bg-gray-700 dark:border-gray-600 fade-in text-left">
                     <div className="flex justify-between items-center mb-2">
                        <label htmlFor="writingArea" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Drafting for {activeDate}
                        </label>
                        {session ? (
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                {saveStatus === 'saving' && <><Loader2 size={14} className="animate-spin" /> Saving...</>}
                                {saveStatus === 'saved' && <><Cloud size={14} /> Saved</>}
                                {saveStatus === 'error' && <><CloudOff size={14} className="text-red-500" /> Save Failed</>}

                                {isPublished && (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold ml-2">
                                        <Globe size={14} /> Public
                                    </span>
                                )}
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
                        placeholder={`Write something for ${activeDate}...`}
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

                    {/* Export & Publish */}
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Export & Share</h3>
                        <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            <button onClick={copyDraft} className="w-full sm:w-auto bg-gray-800 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-900 transition dark:bg-orange-500 dark:hover:bg-orange-600">Copy</button>
                            <button onClick={downloadDraft} className="w-full sm:w-auto bg-white text-gray-800 font-semibold py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 transition dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">Download</button>

                            {session && (
                                <>
                                    {isPublished ? (
                                        <button
                                            onClick={handleUnpublish}
                                            className="w-full sm:w-auto font-semibold py-2 px-4 rounded-md transition flex items-center justify-center gap-2 bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800"
                                        >
                                            <XCircle size={16} /> Unpublish
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handlePublish}
                                            className="w-full sm:w-auto font-semibold py-2 px-4 rounded-md transition flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                        >
                                            <Globe size={16} /> Publish to Community
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2 dark:text-gray-300">{exportStatus}</p>
                    </div>
                </div>
            )}
        </>
    );
}
