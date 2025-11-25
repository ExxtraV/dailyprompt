// lib/gamification.js

export const BADGES = [
    {
        id: 'first_step',
        name: 'First Step',
        description: 'Complete your first writing prompt.',
        icon: '🌱',
        condition: (stats) => stats.completions >= 1
    },
    {
        id: 'three_day_streak',
        name: 'On Fire',
        description: 'Write for 3 days in a row.',
        icon: '🔥',
        condition: (stats) => stats.streak >= 3
    },
    {
        id: 'seven_day_streak',
        name: 'Unstoppable',
        description: 'Write for 7 days in a row.',
        icon: '🚀',
        condition: (stats) => stats.streak >= 7
    },
    {
        id: 'word_novice',
        name: 'Novice Scribe',
        description: 'Write a total of 1,000 words.',
        icon: '✍️',
        condition: (stats) => stats.totalWords >= 1000
    },
    {
        id: 'word_master',
        name: 'Master Wordsmith',
        description: 'Write a total of 10,000 words.',
        icon: '👑',
        condition: (stats) => stats.totalWords >= 10000
    },
    // New Badges
    {
        id: 'run_and_write',
        name: 'Run & Write',
        description: 'Selected as a favorite by the editor.',
        icon: '🏅',
        condition: (stats) => false // Awarded manually via Admin
    },
    {
        id: 'loved',
        name: 'Loved',
        description: 'One of your stories received 10 likes.',
        icon: '💖',
        condition: (stats) => stats.maxLikes >= 10
    },
    {
        id: 'the_creator',
        name: 'The Creator',
        description: 'The one who started it all.',
        icon: '🧙‍♂️',
        condition: (stats) => false // Awarded based on role 'OWNER'
    }
];

export function checkBadges(stats, currentBadges) {
    const newBadges = [];
    const currentBadgeIds = new Set(currentBadges);

    BADGES.forEach(badge => {
        // Skip manual badges in auto-check
        if (badge.id === 'run_and_write' || badge.id === 'the_creator') return;

        if (!currentBadgeIds.has(badge.id) && badge.condition(stats)) {
            newBadges.push(badge.id);
        }
    });

    return newBadges;
}
