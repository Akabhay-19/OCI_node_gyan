
// [UPDATED] Progressive Leveling Constants
export const XP_CONSTANT = 100; // Used in sqrt(xp/100)

export const XP_REWARDS = {
    ASSIGNMENT_COMPLETION: 200, // Highest weight
    REMEDIAL_COMPLETION: 150,   // High priority
    QUIZ_COMPLETION: 50,        // Standard
    QUIZ_PERFECT_SCORE: 50,     // Bonus (Total 100)
    MODULE_GENERATION: 20,      // Low weight
    LOGIN: 10
};

export const LEVEL_TITLES = [
    { level: 1, title: 'Novice' },
    { level: 5, title: 'Apprentice' },
    { level: 10, title: 'Scholar' },
    { level: 20, title: 'Sage' },
    { level: 30, title: 'Master' },
    { level: 50, title: 'Grandmaster' },
    { level: 75, title: 'Legend' },
    { level: 100, title: 'Mythic' },
    { level: 150, title: 'Ascended' },
    { level: 200, title: 'Divine' },
    { level: 300, title: 'Immortal' },
    { level: 500, title: 'Omniscient' }
];

// Progressive Formula: Level = floor(sqrt(XP / 100)) + 1
export const calculateLevel = (xp: number): number => {
    return Math.floor(Math.sqrt(Math.max(0, xp) / XP_CONSTANT)) + 1;
};

// Inverse Formula: XP = (Level - 1)^2 * 100
export const getLevelProgress = (xp: number) => {
    const level = calculateLevel(xp);

    // XP required to reach the START of current level
    const currentLevelBaseXp = Math.pow(level - 1, 2) * XP_CONSTANT;

    // XP required to reach the NEXT level
    const nextLevelBaseXp = Math.pow(level, 2) * XP_CONSTANT;

    const progress = xp - currentLevelBaseXp;
    const requiredForNext = nextLevelBaseXp - currentLevelBaseXp;

    // Safety for level 1 where base and next might behave oddly if logic is off, but here:
    // Lvl 1: Base=0, Next=100. XP=50. Progress=50. Req=100. Pct=50%. Correct.

    const percent = requiredForNext > 0
        ? Math.min(100, Math.max(0, (progress / requiredForNext) * 100))
        : 100;

    return {
        level,
        currentXp: xp,
        nextLevelXp: nextLevelBaseXp,
        progressInLevel: progress,
        percent
    };
};

export const getLevelTitle = (level: number): string => {
    // Find the highest title threshold that is <= current level
    const match = [...LEVEL_TITLES].reverse().find(t => level >= t.level);
    return match ? match.title : 'Novice';
};
