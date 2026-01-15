
export type ConceptId = string;

// 1. KNOWLEDGE GRAPH NODE
export interface ConceptNode {
    id: ConceptId;
    label: string;
    subject: string; // e.g. 'Physics', 'Math'
    difficulty: number; // 0.1 (Easy) to 1.0 (Hard)
    prerequisites: ConceptId[]; // IDs of concepts that MUST be mastered first
}

// 2. STUDENT MASTERY STATE
export interface MasteryRecord {
    conceptId: ConceptId;
    score: number; // 0.0 to 1.0 (Mastery Level)
    confidence: number; // 0.0 to 1.0 (Certainty based on consistency)
    attempts: number; // Total questions attempted
    lastInteraction: number; // Timestamp (Date.now())
    decayFactor: number; // e.g. 0.95 (Mastery drops over time if not practiced)
    history: {
        timestamp: number;
        score: number;
    }[];
}

// 3. GAP DETECTION
export enum GapType {
    PREREQUISITE = 'PREREQUISITE', // Failed because didn't know parent concept
    CONCEPTUAL = 'CONCEPTUAL',     // Knows prereqs, but lacks understanding of this concept
    APPLICATION = 'APPLICATION',   // Knows concept, but fails word problems/application
    RETENTION = 'RETENTION',       // Knew it before, but forgot (time decay)
    NONE = 'NONE'
}

export interface DetectedGap {
    type: GapType;
    conceptId: ConceptId;
    severity: number; // 0.0 to 1.0 (How urgent?)
    reason: string; // Explainable AI reason
    recommendedAction: string; // e.g., "Review Newton's Laws"
}

// 4. QUESTION METADATA (Attached to every question)
export interface QuestionMetadata {
    conceptId: ConceptId;
    difficulty: number; // 0-1
    skillType: 'RECALL' | 'APPLICATION' | 'REASONING';
    prerequisites?: ConceptId[]; // Optional specific prereqs for this Q
}
