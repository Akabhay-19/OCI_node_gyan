
/**
 * Adaptive Learning Service
 * Implements core algorithms for GyanAI:
 * 1. GyanAI Mastery Index (GMI)
 * 2. PID Dynamic Difficulty Adjustment
 * 3. Next Best Action (NBA) Recommendation Engine
 */

class AdaptiveLearningService {
    constructor(supabase) {
        this.supabase = supabase;

        // Weights for GMI
        this.WEIGHTS = {
            ACCURACY: 0.4,
            CONSISTENCY: 0.4,
            TIME_EFFICIENCY: 0.2,
            VOICE_SENTIMENT: 0.1 // Bonus
        };

        // PID Constants
        this.PID = {
            Kp: 0.5, // Proportional
            Ki: 0.1, // Integral
            Kd: 0.2, // Derivative
            TARGET_SCORE: 0.75 // 75% is the "Flow Zone"
        };
    }

    /**
     * Algorithm 1: Calculate GyanAI Mastery Index (GMI)
     * @param {Object} currentMastery - Previous state { score, consistency, lastPracticed }
     * @param {Object} interaction - New interaction { score, maxScore, timeTaken, idealTime, sentiment }
     */
    calculateMastery(currentMastery, interaction) {
        const { score, maxScore, timeTaken, idealTime, sentiment } = interaction;
        const normalizedScore = score / maxScore; // 0.0 - 1.0

        // 1. Forgetting Curve Decay (psi)
        const now = new Date();
        const lastPracticed = currentMastery.lastPracticed ? new Date(currentMastery.lastPracticed) : now;
        const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
        const stability = currentMastery.stability || 1.0;
        const decay = Math.exp(-daysSince / stability); // decay factor

        // 2. Performance Vector (P)
        const timeRatio = idealTime ? Math.min(idealTime / timeTaken, 1.5) : 1.0; // Cap efficiency bonus
        const timeFactor = 1 / (1 + Math.exp(-4 * (timeRatio - 0.5))); // Sigmoid

        const sentimentBonus = sentiment === 'CONFIDENT' ? 1.1 : sentiment === 'HESITANT' ? 0.9 : 1.0;

        const performance = (
            (this.WEIGHTS.ACCURACY * normalizedScore) +
            (this.WEIGHTS.TIME_EFFICIENCY * timeFactor)
        ) * sentimentBonus;

        // 3. Consistency (C)
        // Simple variance tracking would require history array. 
        // Approx: valid if practiced recently
        const consistency = daysSince < 3 ? 1.1 : daysSince < 7 ? 1.0 : 0.9;

        // 4. Recursive Update
        const alpha = 0.3; // Learning rate
        const decayedMastery = (currentMastery.score || 0) * decay;

        let newMastery = (alpha * performance) + ((1 - alpha) * decayedMastery);
        newMastery = Math.min(Math.max(newMastery * consistency, 0), 1); // Clamp 0-1

        // Update stability for next time (Spaced Repetition)
        const newStability = normalizedScore > 0.8 ? stability + 1 : Math.max(0.5, stability - 0.2);

        return {
            score: newMastery,
            stability: newStability,
            lastPracticed: now.toISOString(),
            level: currentMastery.level || 'Medium' // Preserve level
        };
    }

    /**
     * Algorithm 2: PID Dynamic Difficulty Adjustment (DDA)
     * @param {Object} history - Array of recent scores [0.8, 0.6, ...] (newest last)
     * @param {String} currentDifficulty - 'Easy', 'Medium', 'Hard'
     */
    adjustDifficulty(history, currentDifficulty) {
        if (!history || history.length < 3) return currentDifficulty;

        const levels = ['Easy', 'Medium', 'Hard'];
        const currentIdx = levels.indexOf(currentDifficulty);
        const target = this.PID.TARGET_SCORE;

        // Calculate Errors
        const errors = history.map(h => h - target);
        const latestError = errors[errors.length - 1]; // e(t)

        // Integral (Sum of recent errors)
        const integral = errors.reduce((acc, val) => acc + val, 0);

        // Derivative (Rate of change)
        const derivative = errors[errors.length - 1] - errors[errors.length - 2];

        // PID Output
        const adjustment = (this.PID.Kp * latestError) + (this.PID.Ki * integral) + (this.PID.Kd * derivative);

        // Thresholds for change
        if (adjustment > 0.25 && currentIdx < 2) {
            return levels[currentIdx + 1]; // Step Up
        } else if (adjustment < -0.25 && currentIdx > 0) {
            return levels[currentIdx - 1]; // Step Down
        }

        return currentDifficulty; // Stay
    }

    /**
     * Algorithm 3: Next Best Action (NBA)
     * @param {Object} studentData - { performanceData, weaknessHistory }
     */
    recommendActions(studentData) {
        const recommendations = [];
        const { performanceData, weaknessHistory } = studentData;

        // 1. Critical Gaps (Highest Priority)
        // Find gaps with severity 'HIGH' or 'CONCEPTUAL'
        if (weaknessHistory) {
            const criticalGaps = weaknessHistory.filter(w => w.status === 'OPEN' && (w.severity === 'HIGH' || w.gapType === 'CONCEPTUAL'));
            criticalGaps.forEach(gap => {
                recommendations.push({
                    type: 'REMEDIAL',
                    priority: 10,
                    topic: gap.topic,
                    subTopic: gap.subTopic,
                    reason: `High severity gap in ${gap.subTopic}.`,
                    action: { route: '/remedial', params: { gapId: gap.id } }
                });
            });
        }

        // 2. SRS Due Items (Maintenance)
        // Check performanceData for items due for review
        if (performanceData) {
            const now = new Date();
            Object.entries(performanceData).forEach(([topic, data]) => {
                const lastPracticed = new Date(data.lastPracticed);
                const daysSince = (now - lastPracticed) / (1000 * 60 * 60 * 24);
                // Simple interval check based on stability
                const interval = (data.stability || 1) * 3;

                if (daysSince > interval) {
                    recommendations.push({
                        type: 'REVIEW',
                        priority: 8,
                        topic: topic,
                        reason: `It's been ${Math.floor(daysSince)} days since you practiced ${topic}.`,
                        action: { route: '/quiz/generate', params: { topic } }
                    });
                }
            });
        }

        // 3. New Progress (Default)
        // In a real app, this would check the syllabus. 
        recommendations.push({
            type: 'NEW_TOPIC',
            priority: 5,
            topic: 'New Challenge',
            reason: 'Ready to expand your knowledge?',
            action: { route: '/study-plan' }
        });

        // Sort by priority
        return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 3);
    }
}

export default AdaptiveLearningService;
