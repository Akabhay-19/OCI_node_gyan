
export interface ClassDetails {
    grade: string;
    subject: string;
}

export const parseClassDetails = (className: string | undefined): ClassDetails => {
    if (!className) return { grade: 'Grade 10', subject: 'General' };

    const name = className.trim();

    // Default values
    let grade = 'Grade 10';
    let subject = 'General';

    // 1. Try to find Grade/Class X
    // Matches: "Grade 9", "Class 10", "12th Grade", "11th"
    const gradeMatch = name.match(/(?:Grade|Class)\s*(\d+)|(\d+)(?:th|st|nd|rd)?\s*(?:Grade|Class)?/i);
    if (gradeMatch) {
        // catch "9" from "Grade 9" or "9" from "9th"
        const num = gradeMatch[1] || gradeMatch[2];
        if (num) grade = `Grade ${num}`;
    }

    // 2. Try to find Subject
    // Common subjects to look for
    const subjects = [
        'Mathematics', 'Maths', 'Math',
        'Physics', 'Chemistry', 'Biology', 'Science',
        'English', 'Literature', 'History', 'Geography', 'Social Studies',
        'Computer Science', 'Computer', 'CS', 'IT',
        'Hindi', 'Spanish', 'French'
    ];

    const foundSubject = subjects.find(s => name.toLowerCase().includes(s.toLowerCase()));
    if (foundSubject) {
        // Normalize
        if (['Mathematics', 'Maths', 'Math'].includes(foundSubject)) subject = 'Mathematics';
        else if (['Computer Science', 'Computer', 'CS', 'IT'].includes(foundSubject)) subject = 'Computer Science';
        else subject = foundSubject;
    } else {
        // Fallback: If no known subject found, try to use the part of string that ISN'T the grade?
        // For now, defaulting to 'General' is safer than guessing a random word.
        // Or if prompt says "Grade 9 English", and we extracted Grade 9.
        // We could assume the rest is the subject.

        // Simple heuristic: Remove "Grade X" and see what's left.
        let cleanName = name.replace(/(?:Grade|Class)\s*\d+|(\d+)(?:th|st|nd|rd)?/ig, '').trim();
        cleanName = cleanName.replace(/[^a-zA-Z\s]/g, '').trim(); // Remove punctuation
        if (cleanName.length > 2) {
            subject = cleanName; // Use the remainder as subject (e.g. "English")
        }
    }

    return { grade, subject };
};
