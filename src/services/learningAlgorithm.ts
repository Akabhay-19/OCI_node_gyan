import { Student, WeaknessRecord, StudyPlanItem } from '../types';

export type RecommendationType = 'REMEDIAL' | 'QUIZ' | 'PLAN' | 'NONE';

export interface LearningRecommendation {
    type: RecommendationType;
    topic: string;
    subTopic?: string;
    reason: string;
    actionLabel: string;
    context?: any;
}

export const getStudentRecommendation = (student: Student, contextSubject?: string): LearningRecommendation[] => {
    const recommendations: LearningRecommendation[] = [];

    // 1. GAP RECOMMENDATION (High Priority)
    // Filter for open weaknesses
    const openWeaknesses = student.weaknessHistory?.filter(w => w.status === 'OPEN') || [];

    // Sort: Prioritize gaps in the *current context subject*, then by date
    openWeaknesses.sort((a, b) => {
        if (contextSubject) {
            const aIsSubject = a.subject === contextSubject ? 1 : 0;
            const bIsSubject = b.subject === contextSubject ? 1 : 0;
            if (aIsSubject !== bIsSubject) return bIsSubject - aIsSubject; // Context match first
        }
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(); // Newest first
    });

    if (openWeaknesses.length > 0) {
        const criticalWeakness = openWeaknesses[0];
        recommendations.push({
            type: 'REMEDIAL',
            topic: criticalWeakness.topic,
            subTopic: criticalWeakness.subTopic || criticalWeakness.topic,
            reason: `You have a learning gap in ${criticalWeakness.subject} (` + (criticalWeakness.subTopic || criticalWeakness.topic) + `). Let's fix it!`,
            actionLabel: 'Fix Gap',
            context: { gapId: criticalWeakness.id }
        });
    }

    // 2. CONTEXT/EXPLORATION RECOMMENDATION
    // Suggest something related to the current class/subject
    const subjectToSuggest = contextSubject || 'Science'; // Default if no context
    // In a real app, we'd pick a random topic from the curriculum for this subject.
    // For now, we'll prompt a general "Advance your knowledge" in this subject.

    // We can vary the topic suggestion slightly to make it feel dynamic, 
    // or just leave the topic empty and let the user fill it, or suggest a 'Next Chapter'.
    // Here we'll suggest a generic "Next Step" in the subject.

    recommendations.push({
        type: 'PLAN',
        topic: `Advanced ${subjectToSuggest} Concepts`,
        reason: `Since you're studying ${subjectToSuggest}, why not explore advanced topics?`,
        actionLabel: `Explore ${subjectToSuggest}`
    });

    return recommendations;
};
