import { MasteryRecord, ConceptId } from './types';

class MasteryModel {
    // In-memory store: Map<StudentId, Map<ConceptId, MasteryRecord>>
    // For single user demo, we can simplify or assume global context, 
    // but let's allow passing a state object.

    // Constants
    private readonly DECAY_RATE_PER_DAY = 0.05; // 5% decay per day
    private readonly LEARNING_RATE = 0.2; // How fast mastery grows per correct answer

    /**
     * Calculate new mastery after an attempt.
     */
    updateMastery(
        currentRecord: MasteryRecord | undefined,
        conceptId: ConceptId,
        isCorrect: boolean,
        difficulty: number
    ): MasteryRecord {
        const now = Date.now();

        let record = currentRecord || {
            conceptId,
            score: 0.1, // Initial non-zero start
            confidence: 0.5,
            attempts: 0,
            lastInteraction: now,
            decayFactor: 0.95,
            history: []
        };

        // 1. APPLY DECAY FIRST (Simulate forgetting since last time)
        record = this.applyDecay(record, now);

        // 2. UPDATE SCORE
        // If Correct: Increase proportional to difficulty (Harder Q = More gain)
        // If Wrong: Decrease proportional to current mastery (Higher fall if you thought you knew it)

        const previousScore = record.score;
        let outcomeFactor = 0;

        if (isCorrect) {
            // Gain more for harder questions. 
            // e.g. Difficulty 0.8 -> Gain 0.2 * 0.8 = 0.16
            outcomeFactor = this.LEARNING_RATE * difficulty;

            // Diminishing returns as you approach 1.0
            // Delta = (1 - current) * factor
            record.score += (1 - record.score) * outcomeFactor;
        } else {
            // Penalty. Fail easy question -> Big drop. Fail hard question -> Small drop.
            // Penalty factor = (1 - difficulty)
            outcomeFactor = this.LEARNING_RATE * (1 - difficulty);

            record.score -= record.score * outcomeFactor;
        }

        // Clamp 0-1
        record.score = Math.max(0, Math.min(1, record.score));

        // 3. UPDATE META
        record.attempts += 1;
        record.lastInteraction = now;
        record.history.push({ timestamp: now, score: record.score });

        // Confidence grows with attempts (simple heuristic)
        record.confidence = Math.min(1, record.attempts * 0.1);

        return record;
    }

    /**
     * Reduce mastery based on time elapsed.
     */
    applyDecay(record: MasteryRecord, now: number = Date.now()): MasteryRecord {
        const msPerDay = 86400000;
        const daysElapsed = (now - record.lastInteraction) / msPerDay;

        if (daysElapsed > 0.5) { // Only decay if more than half a day passed
            // Formula: New = Old * (1 - Decay)^Days
            // e.g. 0.95^Days
            const retention = Math.pow(1 - this.DECAY_RATE_PER_DAY, daysElapsed);
            record.score = record.score * retention;
            record.lastInteraction = now; // Reset decay clock (conceptually visited)
        }
        return record;
    }

    /**
     * Helper: Get Mock Initial State
     */
    getInitialState(conceptId: ConceptId): MasteryRecord {
        return {
            conceptId,
            score: 0,
            confidence: 0,
            attempts: 0,
            lastInteraction: Date.now(),
            decayFactor: 0.95,
            history: []
        };
    }
}

export const masteryModel = new MasteryModel();
