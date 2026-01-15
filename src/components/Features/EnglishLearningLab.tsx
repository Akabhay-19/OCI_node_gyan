
import React, { useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { BookOpen, Code, Languages, Play, ChevronRight, Lightbulb, Clock, History, Rocket, RefreshCw, GraduationCap, Table, ArrowLeft, Bot, PenTool } from 'lucide-react';
import { EnglishIDE } from './EnglishIDE';
import { TranslationPractice } from './TranslationPractice';
import { WritingAssistant } from './WritingAssistant';
import { AITutor } from './AITutor';
import { Student } from '../../types';

interface TenseRuleTable {
    type: string;
    affirmative: string;
    negative: string;
    question: string;
    example: string;
}

interface TenseCategory {
    id: string;
    title: string;
    icon: React.ElementType;
    color: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    definition: string;
    ruleTable: TenseRuleTable[];
    examples: { hindi: string; english: string; explanation: string }[];
}

const TENSES: TenseCategory[] = [
    {
        id: 'present', title: 'Present Tense', icon: Clock, color: 'cyan', level: 'Beginner',
        definition: 'Present Tense describes actions happening now, habitual actions, or general truths.',
        ruleTable: [
            { type: 'Simple Present', affirmative: 'S + V1 (s/es)', negative: 'S + do/does + not + V1', question: 'Do/Does + S + V1?', example: 'I go / He goes' },
            { type: 'Present Continuous', affirmative: 'S + is/am/are + V-ing', negative: 'S + is/am/are + not + V-ing', question: 'Is/Am/Are + S + V-ing?', example: 'I am going' },
            { type: 'Present Perfect', affirmative: 'S + has/have + V3', negative: 'S + has/have + not + V3', question: 'Has/Have + S + V3?', example: 'I have gone' },
            { type: 'Present Perfect Continuous', affirmative: 'S + has/have been + V-ing', negative: 'S + has/have + not + been + V-ing', question: 'Has/Have + S + been + V-ing?', example: 'I have been going' },
        ],
        examples: [
            { hindi: 'मैं रोज़ स्कूल जाता हूँ।', english: 'I go to school every day.', explanation: 'Simple Present' },
            { hindi: 'वह अभी खाना खा रहा है।', english: 'He is eating food right now.', explanation: 'Present Continuous' },
            { hindi: 'मैंने अपना काम पूरा कर लिया है।', english: 'I have completed my work.', explanation: 'Present Perfect' },
            { hindi: 'मैं दो घंटे से पढ़ रहा हूँ।', english: 'I have been studying for two hours.', explanation: 'Present Perfect Continuous' },
        ]
    },
    {
        id: 'past', title: 'Past Tense', icon: History, color: 'purple', level: 'Beginner',
        definition: 'Past Tense describes actions that have already happened before the present moment.',
        ruleTable: [
            { type: 'Simple Past', affirmative: 'S + V2', negative: 'S + did + not + V1', question: 'Did + S + V1?', example: 'I went / He ate' },
            { type: 'Past Continuous', affirmative: 'S + was/were + V-ing', negative: 'S + was/were + not + V-ing', question: 'Was/Were + S + V-ing?', example: 'I was going' },
            { type: 'Past Perfect', affirmative: 'S + had + V3', negative: 'S + had + not + V3', question: 'Had + S + V3?', example: 'I had gone' },
            { type: 'Past Perfect Continuous', affirmative: 'S + had been + V-ing', negative: 'S + had + not + been + V-ing', question: 'Had + S + been + V-ing?', example: 'I had been going' },
        ],
        examples: [
            { hindi: 'मैं कल स्कूल गया था।', english: 'I went to school yesterday.', explanation: 'Simple Past' },
            { hindi: 'वह खाना खा रहा था जब मैं आया।', english: 'He was eating when I arrived.', explanation: 'Past Continuous' },
            { hindi: 'मैंने खाना खा लिया था इससे पहले।', english: 'I had eaten before he came.', explanation: 'Past Perfect' },
            { hindi: 'वह दो घंटे से पढ़ रहा था।', english: 'He had been studying for two hours.', explanation: 'Past Perfect Continuous' },
        ]
    },
    {
        id: 'future', title: 'Future Tense', icon: Rocket, color: 'blue', level: 'Beginner',
        definition: 'Future Tense describes actions that will happen later.',
        ruleTable: [
            { type: 'Simple Future', affirmative: 'S + will/shall + V1', negative: 'S + will/shall + not + V1', question: 'Will/Shall + S + V1?', example: 'I will go' },
            { type: 'Future Continuous', affirmative: 'S + will be + V-ing', negative: 'S + will + not + be + V-ing', question: 'Will + S + be + V-ing?', example: 'I will be going' },
            { type: 'Future Perfect', affirmative: 'S + will have + V3', negative: 'S + will + not + have + V3', question: 'Will + S + have + V3?', example: 'I will have gone' },
            { type: 'Future Perfect Continuous', affirmative: 'S + will have been + V-ing', negative: 'S + will + not + have been + V-ing', question: 'Will + S + have been + V-ing?', example: 'I will have been going' },
        ],
        examples: [
            { hindi: 'मैं कल स्कूल जाऊँगा।', english: 'I will go to school tomorrow.', explanation: 'Simple Future' },
            { hindi: 'वह कल इस समय पढ़ रहा होगा।', english: 'He will be studying at this time tomorrow.', explanation: 'Future Continuous' },
            { hindi: 'मैं 5 बजे तक काम पूरा कर चुका होऊँगा।', english: 'I will have completed the work by 5.', explanation: 'Future Perfect' },
            { hindi: 'वह दो साल से काम कर रहा होगा।', english: 'He will have been working for two years.', explanation: 'Future Perfect Continuous' },
        ]
    },
];

// --- NEW DATA STRUCTURES FOR DETAILED THEORY ---

const VOICE_RULES = {
    definition: 'Passive voice focuses on the action or the receiver, rather than the doer.',
    subTypes: [
        { title: 'Simple Present', rule: 'is/am/are + V3', active: 'He writes a letter.', passive: 'A letter is written by him.' },
        { title: 'Present Continuous', rule: 'is/am/are + being + V3', active: 'He is writing a letter.', passive: 'A letter is being written by him.' },
        { title: 'Present Perfect', rule: 'has/have + been + V3', active: 'He has written a letter.', passive: 'A letter has been written by him.' },
        { title: 'Simple Past', rule: 'was/were + V3', active: 'He wrote a letter.', passive: 'A letter was written by him.' },
        { title: 'Past Continuous', rule: 'was/were + being + V3', active: 'He was writing a letter.', passive: 'A letter was being written by him.' },
        { title: 'Past Perfect', rule: 'had + been + V3', active: 'He had written a letter.', passive: 'A letter had been written by him.' },
        { title: 'Simple Future', rule: 'will + be + V3', active: 'He will write a letter.', passive: 'A letter will be written by him.' },
        { title: 'Future Perfect', rule: 'will + have + been + V3', active: 'He will have written a letter.', passive: 'A letter will have been written by him.' },
    ]
};

const NOUN_VERB_RULES = {
    definition: 'Nouns name things/people. Verbs describe actions/states.',
    subTypes: [
        { title: 'Proper Noun', rule: 'Specific names (capitalized)', example: 'Delhi, Rahul, Sunday' },
        { title: 'Common Noun', rule: 'General names', example: 'city, boy, day' },
        { title: 'Collective Noun', rule: 'Groups of things', example: 'team, flock, bunch' },
        { title: 'Abstract Noun', rule: 'Ideas/feelings (cannot touch)', example: 'love, honesty, freedom' },
        { title: 'Action Verb', rule: 'Physical/Mental action', example: 'run, think, eat' },
        { title: 'Helping Verb', rule: 'Helps the main verb', example: 'is, am, are, have' },
    ]
};

const OTHER_TOPICS = [
    { id: 'voices', title: 'Active & Passive Voice', description: 'Convert Active to Passive', icon: RefreshCw, color: 'orange', level: 'Intermediate' as const, data: VOICE_RULES },
    { id: 'nouns_verbs', title: 'Nouns & Verbs', description: 'Parts of Speech mastery', icon: GraduationCap, color: 'green', level: 'Beginner' as const, data: NOUN_VERB_RULES },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/50' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/50' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/50' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/50' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/50' },
};

export const EnglishLearningLab: React.FC<{ currentUser?: Student; onUpdateStudent?: (s: Student) => void }> = ({ currentUser, onUpdateStudent }) => {
    const [activeTab, setActiveTab] = useState<'STUDY' | 'PRACTICE' | 'WRITING' | 'IDE' | 'TUTOR'>('STUDY');
    const [studyView, setStudyView] = useState<'CATEGORIES' | 'TENSES' | 'TENSE_DETAIL' | 'TOPIC_DETAIL'>('CATEGORIES');
    const [selectedTense, setSelectedTense] = useState<TenseCategory | null>(null);
    const [selectedDetailTopic, setSelectedDetailTopic] = useState<any>(null);
    const [selectedTopicForPractice, setSelectedTopicForPractice] = useState<string>('General');
    const [initialTutorMessage, setInitialTutorMessage] = useState<string | undefined>(undefined);

    const handlePractice = (topic: string) => {
        setSelectedTopicForPractice(topic);
        setActiveTab('PRACTICE');
    };

    const handleAskTutor = (message: string) => {
        setInitialTutorMessage(message);
        setActiveTab('TUTOR');
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 px-2 sm:px-0">
            {/* Header - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                        Linguist Studio
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm">Treat English like Code</p>
                </div>
                {/* Tab Navigation - Scrollable on mobile */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 overflow-x-auto">
                    <button onClick={() => { setActiveTab('STUDY'); setStudyView('CATEGORIES'); }} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-all ${activeTab === 'STUDY' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500'}`}>
                        <BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Study Logic</span><span className="sm:hidden">Study</span>
                    </button>
                    <button onClick={() => setActiveTab('PRACTICE')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-all ${activeTab === 'PRACTICE' ? 'bg-green-500/20 text-green-400' : 'text-gray-500'}`}>
                        <Languages className="w-4 h-4" /> <span className="hidden sm:inline">Translation Lab</span><span className="sm:hidden">Practice</span>
                    </button>
                    <button onClick={() => setActiveTab('WRITING')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-all ${activeTab === 'WRITING' ? 'bg-pink-500/20 text-pink-400' : 'text-gray-500'}`}>
                        <PenTool className="w-4 h-4" /> <span className="hidden sm:inline">Writing Studio</span><span className="sm:hidden">Writing</span>
                    </button>
                    <button onClick={() => setActiveTab('IDE')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-all ${activeTab === 'IDE' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500'}`}>
                        <Code className="w-4 h-4" /> IDE
                    </button>
                    <button onClick={() => setActiveTab('TUTOR')} className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-all ${activeTab === 'TUTOR' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500'}`}>
                        <Bot className="w-4 h-4" /> <span className="hidden sm:inline">AI Tutor</span><span className="sm:hidden">Tutor</span>
                    </button>
                </div>
            </div>

            {/* STUDY TAB */}
            {activeTab === 'STUDY' && (
                <>
                    {/* CATEGORIES */}
                    {studyView === 'CATEGORIES' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <NeonCard glowColor="cyan" className="p-4 sm:p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setStudyView('TENSES')}>
                                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-white">Tenses</h3>
                                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">Beginner</span>
                                    </div>
                                </div>
                                <p className="text-gray-400 text-sm sm:text-base mb-3 sm:mb-4">Master Present, Past & Future tenses with rule tables.</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap gap-1 sm:gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/10 text-cyan-400">Present</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 text-purple-400">Past</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400">Future</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                </div>
                            </NeonCard>
                            {OTHER_TOPICS.map(topic => {
                                const TopicIcon = topic.icon;
                                const colors = colorClasses[topic.color];
                                return (
                                    <NeonCard key={topic.id} glowColor={topic.color as any} className="p-4 sm:p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => { setSelectedDetailTopic(topic); setStudyView('TOPIC_DETAIL'); }}>
                                        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                                <TopicIcon className={`w-6 h-6 sm:w-8 sm:h-8 ${colors.text}`} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg sm:text-xl font-bold text-white">{topic.title}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${topic.level === 'Beginner' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{topic.level}</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-400 text-sm sm:text-base mb-3 sm:mb-4">{topic.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">View Rules & Types</span>
                                            <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                                        </div>
                                    </NeonCard>
                                );
                            })}
                        </div>
                    )}

                    {/* TENSES OVERVIEW */}
                    {studyView === 'TENSES' && (
                        <div className="space-y-4 sm:space-y-6">
                            <button onClick={() => setStudyView('CATEGORIES')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <NeonCard className="p-4 sm:p-6 border-cyan-500/30">
                                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                                        <Table className="w-5 h-5 sm:w-7 sm:h-7 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-white">Understanding Tenses</h2>
                                        <p className="text-gray-400 text-xs sm:text-sm">The backbone of English grammar</p>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-3 sm:mb-4">
                                    <strong>Tenses</strong> tell us <strong>when</strong> an action happens. English has 3 main tenses with 4 forms each.
                                </p>
                                <div className="bg-black/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/5 text-xs sm:text-sm">
                                    <div className="text-gray-400 mb-1">Quick Tip:</div>
                                    <div className="text-white">V1 = Base (go), V2 = Past (went), V3 = Past Participle (gone)</div>
                                </div>
                            </NeonCard>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                                {TENSES.map(tense => {
                                    const TenseIcon = tense.icon;
                                    const colors = colorClasses[tense.color];
                                    return (
                                        <NeonCard key={tense.id} glowColor={tense.color as any} className="p-4 sm:p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => { setSelectedTense(tense); setStudyView('TENSE_DETAIL'); }}>
                                            <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                                    <TenseIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-white">{tense.title}</h3>
                                            </div>
                                            <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">{tense.definition}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">4 Forms</span>
                                                <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                                            </div>
                                        </NeonCard>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TENSE DETAIL */}
                    {studyView === 'TENSE_DETAIL' && selectedTense && (
                        <div className="space-y-4 sm:space-y-6">
                            <button onClick={() => setStudyView('TENSES')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>

                            {/* Header */}
                            <NeonCard glowColor={selectedTense.color as any} className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${colorClasses[selectedTense.color].bg} flex items-center justify-center flex-shrink-0`}>
                                            <selectedTense.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${colorClasses[selectedTense.color].text}`} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedTense.title}</h2>
                                            <p className="text-gray-400 text-xs sm:text-sm">{selectedTense.definition}</p>
                                        </div>
                                    </div>
                                    <NeonButton onClick={() => handlePractice(selectedTense.title)} variant="primary">
                                        <Play className="w-4 h-4 mr-1 sm:mr-2" /> Practice All {selectedTense.title}
                                    </NeonButton>
                                </div>
                            </NeonCard>

                            {/* RULE TABLE */}
                            <NeonCard className="p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                                    <Table className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> Rule Book
                                </h3>
                                {/* Legend - 2 cols on mobile */}
                                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                                    <div className="text-xs sm:text-sm font-bold text-yellow-400 mb-2">📖 Key</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                                        <div className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-cyan-400">S</span><span className="text-gray-300">Subject</span></div>
                                        <div className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-green-400">V1</span><span className="text-gray-300">Base</span></div>
                                        <div className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-purple-400">V2</span><span className="text-gray-300">Past</span></div>
                                        <div className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-blue-400">V3</span><span className="text-gray-300">P.Part</span></div>
                                    </div>
                                </div>
                                {/* Table - Cards on mobile, table on desktop */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left py-3 px-2 text-gray-400 font-bold">Type</th>
                                                <th className="text-left py-3 px-2 text-green-400 font-bold">✓ Affirmative</th>
                                                <th className="text-left py-3 px-2 text-red-400 font-bold">✗ Negative</th>
                                                <th className="text-left py-3 px-2 text-blue-400 font-bold">? Question</th>
                                                <th className="text-left py-3 px-2 text-gray-400 font-bold">Example</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedTense.ruleTable.map((rule, i) => (
                                                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                    <td className="py-3 px-2 font-bold text-white text-xs">{rule.type}</td>
                                                    <td className="py-3 px-2 text-gray-300 font-mono text-xs">{rule.affirmative}</td>
                                                    <td className="py-3 px-2 text-gray-300 font-mono text-xs">{rule.negative}</td>
                                                    <td className="py-3 px-2 text-gray-300 font-mono text-xs">{rule.question}</td>
                                                    <td className="py-3 px-2 text-cyan-400 italic text-xs">{rule.example}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile Cards */}
                                <div className="sm:hidden space-y-3">
                                    {selectedTense.ruleTable.map((rule, i) => (
                                        <div key={i} className="bg-black/30 p-3 rounded-lg border border-white/5">
                                            <div className="font-bold text-white text-sm mb-2">{rule.type}</div>
                                            <div className="grid grid-cols-1 gap-1 text-xs">
                                                <div><span className="text-green-400">✓</span> <span className="text-gray-400 font-mono">{rule.affirmative}</span></div>
                                                <div><span className="text-red-400">✗</span> <span className="text-gray-400 font-mono">{rule.negative}</span></div>
                                                <div><span className="text-blue-400">?</span> <span className="text-gray-400 font-mono">{rule.question}</span></div>
                                                <div className="text-cyan-400 italic mt-1">e.g. {rule.example}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </NeonCard>

                            {/* EXAMPLES */}
                            <NeonCard className="p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" /> Examples
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    {selectedTense.examples.map((ex, i) => (
                                        <div key={i} className="bg-black/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">Hindi:</div>
                                            <div className="text-white text-sm sm:text-base font-medium mb-2">{ex.hindi}</div>
                                            <div className="text-xs text-gray-500 mb-1">English:</div>
                                            <div className="text-green-400 text-sm sm:text-base font-medium mb-2">{ex.english}</div>
                                            <div className="text-xs text-blue-400 italic pt-2 border-t border-white/5">💡 {ex.explanation}</div>
                                        </div>
                                    ))}
                                </div>
                            </NeonCard>
                        </div>
                    )}
                    {/* NEW TOPIC DETAIL VIEW (Reusable for Voices, Nouns, etc.) */}
                    {studyView === 'TOPIC_DETAIL' && selectedDetailTopic && (
                        <div className="space-y-4 sm:space-y-6">
                            <button onClick={() => setStudyView('CATEGORIES')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>

                            {/* Header */}
                            <NeonCard glowColor={selectedDetailTopic.color} className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${colorClasses[selectedDetailTopic.color].bg} flex items-center justify-center flex-shrink-0`}>
                                            <selectedDetailTopic.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${colorClasses[selectedDetailTopic.color].text}`} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedDetailTopic.title}</h2>
                                            <p className="text-gray-400 text-xs sm:text-sm">{selectedDetailTopic.data.definition}</p>
                                        </div>
                                    </div>
                                    <NeonButton onClick={() => handlePractice(selectedDetailTopic.title + " - Mix")} variant="primary">
                                        <Play className="w-4 h-4 mr-1 sm:mr-2" /> Practice All Types (Mix)
                                    </NeonButton>
                                </div>
                            </NeonCard>

                            {/* Sub-types Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedDetailTopic.data.subTypes.map((sub: any, i: number) => (
                                    <NeonCard key={i} className="p-4 flex flex-col justify-between hover:bg-white/5 transition-colors">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className={`font-bold ${colorClasses[selectedDetailTopic.color].text}`}>{sub.title}</h3>
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono mb-2 bg-black/20 p-1.5 rounded border border-white/5">
                                                {sub.rule}
                                            </div>
                                            {sub.active && (
                                                <div className="space-y-1 mb-3">
                                                    <div className="text-xs text-gray-500">Active: <span className="text-gray-300">{sub.active}</span></div>
                                                    <div className="text-xs text-gray-500">Passive: <span className="text-gray-300">{sub.passive}</span></div>
                                                </div>
                                            )}
                                            {sub.example && (
                                                <div className="text-xs text-gray-300 italic mb-3">"{sub.example}"</div>
                                            )}
                                        </div>
                                        <NeonButton
                                            onClick={() => handlePractice(selectedDetailTopic.title + " - " + sub.title)}
                                            variant="secondary"
                                            size="sm"
                                            className="w-full mt-2"
                                        >
                                            Practice This
                                        </NeonButton>
                                    </NeonCard>
                                ))}
                            </div>

                            {/* Note for Missing Tenses - Only for Passive Voice */}
                            {selectedDetailTopic.id === 'voices' && (
                                <NeonCard className="p-4 sm:p-5 border-orange-500/30 bg-orange-500/5">
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-orange-500/10 rounded-lg h-fit">
                                            <Lightbulb className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-orange-400 mb-2">Why are 4 Tenses Missing?</h4>
                                            <p className="text-gray-300 text-sm leading-relaxed mb-3">
                                                According to English Grammar rules, the following tenses are <strong>never converted to Passive Voice</strong> because they sound awkward and unnatural:
                                            </p>
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-400">
                                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Present Perfect Continuous</li>
                                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Past Perfect Continuous</li>
                                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Future Continuous</li>
                                                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Future Perfect Continuous</li>
                                            </ul>
                                        </div>
                                    </div>
                                </NeonCard>
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'PRACTICE' && (
                <TranslationPractice
                    topic={selectedTopicForPractice}
                    level="Beginner"
                    currentUser={currentUser}
                    onUpdateStudent={onUpdateStudent}
                />
            )}

            {activeTab === 'WRITING' && (
                <WritingAssistant />
            )}

            {activeTab === 'IDE' && (
                <EnglishIDE onAskTutor={handleAskTutor} />
            )}

            {activeTab === 'TUTOR' && (
                <AITutor initialMessage={initialTutorMessage} />
            )}
        </div>
    );
};
