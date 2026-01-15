import { DetectedGap, GapType, MasteryRecord, ConceptId } from './types';
import { knowledgeGraph } from './KnowledgeGraph';

class GapDetector {
    private readonly MASTERY_THRESHOLD = 0.7; // Below this is a gap
    private readonly RETENTION_DAYS = 7; // If not practiced in 7 days, check retention

    /**
     * Analyze a student's mastery state to find gaps.
     */
    detectGaps(masteryMap: Map<ConceptId, MasteryRecord>): DetectedGap[] {
        const gaps: DetectedGap[] = [];

        masteryMap.forEach((record, conceptId) => {
            const node = knowledgeGraph.getNode(conceptId);
            if (!node) return;

            // 1. PREREQUISITE GAP CHECK
            // If current concept is weak, check parents
            if (record.score < this.MASTERY_THRESHOLD) {
                const parents = knowledgeGraph.getPrerequisites(conceptId);
                let missingPrereq: string | null = null;

                for (const p of parents) {
                    const pRecord = masteryMap.get(p.id);
                    // If parent is detected as weak OR missing entirely
                    if (!pRecord || pRecord.score < this.MASTERY_THRESHOLD) {
                        missingPrereq = p.label;

                        gaps.push({
                            type: GapType.PREREQUISITE,
                            conceptId: conceptId,
                            severity: 0.9, // High priority
                            reason: `Struggling with '${node.label}' because foundational concept '${p.label}' is weak.`,
                            recommendedAction: `Review ${p.label} first`
                        });
                    }
                }

                // 2. CONCEPTUAL GAP (If parents are fine, but this one is failing)
                if (!missingPrereq && record.attempts > 3) {
                    gaps.push({
                        type: GapType.CONCEPTUAL,
                        conceptId: conceptId,
                        severity: 0.7,
                        reason: `You've tried '${node.label}' multiple times but score is still low. You might be missing the core theory.`,
                        recommendedAction: `Watch a video or read notes on ${node.label}`
                    });
                }
            }

            // 3. RETENTION GAP (Decay Check)
            // If score WAS good (historically) but high time elapsed
            // (Simplified: Just check if last interaction was long ago)
            const daysSince = (Date.now() - record.lastInteraction) / 86400000;
            if (record.score > 0.8 && daysSince > this.RETENTION_DAYS) {
                gaps.push({
                    type: GapType.RETENTION,
                    conceptId: conceptId,
                    severity: 0.4, // Low urgency, just maintenance
                    reason: `You mastered '${node.label}' a while ago. Time for a quick refresher!`,
                    recommendedAction: `Take a quick 5-min quiz on ${node.label}`
                });
            }
        });

        // Sort by severity (descending)
        return gaps.sort((a, b) => b.severity - a.severity);
    }
}

export const gapDetector = new GapDetector();
