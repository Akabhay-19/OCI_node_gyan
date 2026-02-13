import React, { useState, useRef } from 'react';
import { calculateLevel } from '../../services/gamification';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { NeonCard, NeonButton, Input } from '../UIComponents';
import { HistorySidebar } from './HistorySidebar';
import { api, DEFAULT_MODEL } from '../../services/api';
import { QuizQuestion, Student, WeaknessRecord } from '../../types';
import { Brain, Award, Info, AlertTriangle, Flag, Sword, Zap, Target, Shuffle, Menu, History, XCircle } from 'lucide-react';

interface QuizModeProps {
  studentId?: string;
  initialQuiz?: QuizQuestion[];
  initialTopic?: string;
  contextClass?: any;
  currentUser?: Student;
  onUpdateStudent?: (student: Student) => void;
}

export const QuizMode: React.FC<QuizModeProps> = ({ studentId, initialQuiz, initialTopic, contextClass, currentUser, onUpdateStudent }) => {
  const [config, setConfig] = useState({ topic: initialTopic || '', grade: contextClass?.grade || 'Grade 10' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [allUserAnswers, setAllUserAnswers] = useState<(number | null)[]>([]); // Track all answers for analysis


  // [NEW] Flag / Custom Answer State
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, string>>({}); // valid index -> custom answer (or empty string)
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagText, setFlagText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  React.useEffect(() => {
    if (initialQuiz && initialQuiz.length > 0) {
      setQuestions(initialQuiz);
      setScore(0);
      setCurrentIndex(0);
      setShowResult(false);
      setIsAnswered(false);
      setSelectedOption(null);
      setFlaggedQuestions({});
      if (initialTopic) setConfig(prev => ({ ...prev, topic: initialTopic }));
    }
  }, [initialQuiz, initialTopic]);

  const startQuiz = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || config.topic;
    if (!topicToUse) return;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setShowResult(false);
    setScore(0);
    setCurrentIndex(0);
    setFlaggedQuestions({});
    startTimeRef.current = Date.now();
    setAllUserAnswers([]);

    try {
      const response = await api.generateQuiz(
        topicToUse,
        config.grade,
        20,
        studentId,
        undefined,
        contextClass?.id
      );
      setQuestions(response.questions || response);
      if (overrideTopic) setConfig(prev => ({ ...prev, topic: overrideTopic }));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate quiz. check API connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    setIsFlagging(false);

    // Store answer
    setAllUserAnswers(prev => {
      const newAns = [...prev];
      newAns[currentIndex] = idx;
      return newAns;
    });

    if (idx === questions[currentIndex].correctAnswer) setScore(s => s + 1);
  };

  const handleFlagClick = () => {
    if (isAnswered && !flaggedQuestions[currentIndex]) return; // If already answered normally, ignore unless editing flag?
    setIsFlagging(!isFlagging);
  };

  const submitFlag = () => {
    if (!flagText.trim()) return;
    setFlaggedQuestions(prev => ({ ...prev, [currentIndex]: flagText }));
    setIsFlagging(false);
    setIsAnswered(true); // Treat as answered
    // Do not increment score for flagged questions usually, or maybe manual review later
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsFlagging(false);
      setFlagText("");
    } else {
      setShowResult(true);
    }
  };

  React.useEffect(() => {
    if (showResult && questions.length > 0) {
      const percentage = score / questions.length;
      const xpEarned = Math.round(percentage * 30);

      const quizHistory = JSON.parse(localStorage.getItem('GYAN_QUIZ_HISTORY') || '[]');
      const newEntry = {
        id: `QUIZ-${Date.now()}`,
        topic: config.topic,
        score,
        total: questions.length,
        xpEarned,
        completedAt: new Date().toISOString(),
        flags: flaggedQuestions
      };
      quizHistory.push(newEntry);
      localStorage.setItem('GYAN_QUIZ_HISTORY', JSON.stringify(quizHistory));

      if (currentUser && onUpdateStudent) {
        // [UPDATED] Submit to Patent-Ready Adaptive Engine
        (async () => {
          const timeTaken = (Date.now() - startTimeRef.current) / 1000;
          const idealTime = (questions.length * 60) || 600;

          let detectedGaps: any[] = [];
          // Only run heavy analysis if score is below threshold (70%)
          if (percentage < 0.7) {
            try {
              console.log('[Gap Detection] Analyzing specifics...');
              const answersToAnalyze = questions.map((_, i) => allUserAnswers[i] ?? -1);
              const weakConcepts = await api.analyzeQuizResults(config.topic, questions, answersToAnalyze);
              detectedGaps = weakConcepts.map((concept: string) => ({
                topic: config.topic,
                subTopic: concept,
                gapType: 'KNOWLEDGE',
                severity: 'HIGH',
                atomicTopic: concept
              }));
            } catch (e) { console.error("Analysis failed:", e); }
          }

          try {
            await api.submitQuizResult({
              studentId: currentUser.id,
              topic: config.topic,
              score,
              totalQuestions: questions.length,
              timeTaken,
              idealTime,
              sentiment: 'NEUTRAL',
              gaps: detectedGaps,
              classId: contextClass?.id
            });

            // Optimistic Local Update
            onUpdateStudent({
              ...currentUser,
              xp: (currentUser.xp || 0) + xpEarned,
              level: calculateLevel((currentUser.xp || 0) + xpEarned),
              // We don't update weaknessHistory locally in detail, waiting for fetch/refresh
            });

          } catch (e) {
            console.error("Submission failed:", e);
          }
        })();
      }
    }
  }, [showResult, score, questions.length, config.topic, currentUser, onUpdateStudent, contextClass, flaggedQuestions]);

  const handleHistorySelect = (item: any) => {
    if (item.content) {
      setQuestions(item.content);
      setScore(0);
      setCurrentIndex(0);
      setShowResult(false);
      setIsAnswered(false);
      setSelectedOption(null);
      setFlaggedQuestions({});
    }
  };

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col justify-center items-center h-[500px] gap-6 animate-in fade-in">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-neon-cyan/20 animate-spin border-t-neon-cyan"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sword className="w-8 h-8 text-neon-cyan animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">Preparing the Arena...</h3>
          <p className="text-neon-cyan font-mono text-sm">Generating challenging questions</p>
        </div>
      </div>
    );

    if (error) return (
      <NeonCard glowColor="red" className="p-8 max-w-xl mx-auto text-center border-red-500/30">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Challenge Generation Failed</h3>
        <p className="text-red-300 mb-6 bg-red-500/10 p-4 rounded border border-red-500/20 font-mono text-xs">{error}</p>
        <NeonButton onClick={() => setError(null)} variant="secondary">Try Again</NeonButton>
      </NeonCard>
    );

    if (showResult) {
      const xpEarned = Math.round((score / questions.length) * 30);
      const flagsCount = Object.keys(flaggedQuestions).length;
      return (
        <NeonCard glowColor="purple" className="text-center p-12 max-w-md mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"></div>
          <Award className="w-24 h-24 mx-auto text-yellow-400 animate-bounce mb-6" />
          <h2 className="text-4xl font-display font-bold text-white mb-2">Challenge Complete!</h2>
          <div className="text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-neon-purple to-pink-500 my-6 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">{score}/{questions.length}</div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
              <p className="text-yellow-400 font-bold text-xl">+{xpEarned}</p>
              <p className="text-gray-400 text-xs uppercase tracking-wider">XP Earned</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
              <p className="text-blue-400 font-bold text-xl">{Math.round((score / questions.length) * 100)}%</p>
              <p className="text-gray-400 text-xs uppercase tracking-wider">Accuracy</p>
            </div>
          </div>

          {flagsCount > 0 && (
            <div className="text-xs text-orange-400 mb-6 flex items-center justify-center gap-2">
              <Flag className="w-3 h-3" /> You flagged {flagsCount} questions for review
            </div>
          )}

          <NeonButton onClick={() => { setQuestions([]); setShowResult(false); }} className="w-full h-12 text-lg" glow>Return to Arena</NeonButton>
        </NeonCard>
      );
    }

    if (questions.length > 0) {
      const currentQ = questions[currentIndex];
      const flagged = !!flaggedQuestions[currentIndex];

      return (
        <div className="max-w-4xl mx-auto">
          {/* Header Status */}
          <div className="flex justify-between items-center mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="bg-gray-800 rounded-full px-4 py-1.5 border border-white/10 text-xs font-bold text-gray-300">
                QUESTION {currentIndex + 1} / {questions.length}
              </div>
              <div className="bg-gray-800 rounded-full px-4 py-1.5 border border-white/10 text-xs font-bold text-neon-cyan">
                SCORE: {score}
              </div>
            </div>
            {/* Flag Button */}
            <button
              onClick={handleFlagClick}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${flagged ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              disabled={isAnswered && !flagged}
            >
              <Flag className="w-3 h-3" /> {flagged ? 'Flagged' : 'Flag Issue'}
            </button>
          </div>

          <NeonCard className="p-8 md:p-10 relative overflow-hidden min-h-[400px]" glowColor={flagged ? 'red' : 'blue'}>

            {/* Question */}
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-8 leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={{ p: ({ node, ...props }) => <span {...props} /> }}>
                {currentQ.question}
              </ReactMarkdown>
            </h3>

            {/* Main Content Area */}
            {!isFlagging && !flagged ? (
              <div className="grid grid-cols-1 gap-4">
                {currentQ.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleOptionClick(idx)} disabled={isAnswered}
                    className={`
                                group w-full text-left p-5 rounded-xl border-2 transition-all duration-200 relative overflow-hidden
                                ${isAnswered
                        ? (idx === currentQ.correctAnswer ? 'border-green-500 bg-green-500/10' : (idx === selectedOption ? 'border-red-500 bg-red-500/10' : 'border-white/5 opacity-40'))
                        : 'border-white/10 hover:border-neon-cyan hover:bg-white/5'
                      }
                            `}>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border
                                    ${isAnswered
                          ? (idx === currentQ.correctAnswer ? 'border-green-500 text-green-500 bg-green-500/20' : (idx === selectedOption ? 'border-red-500 text-red-500 bg-red-500/20' : 'border-gray-600 text-gray-600'))
                          : 'border-white/20 text-gray-400 group-hover:border-neon-cyan group-hover:text-neon-cyan'
                        }
                                `}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className={`flex-1 text-lg ${isAnswered && idx === currentQ.correctAnswer ? 'text-green-400 font-bold' : 'text-gray-200'}`}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]} components={{ p: ({ node, ...props }) => <span {...props} /> }}>
                          {opt}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
                <h4 className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5" /> Report Issue / Custom Answer
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  If the options are incorrect or you have a better answer, please describe it below. This will be sent to the teacher for review.
                </p>
                <textarea
                  className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-orange-500 outline-none min-h-[120px]"
                  placeholder="Type your answer or issue here..."
                  value={flaggedQuestions[currentIndex] || flagText}
                  onChange={(e) => setFlagText(e.target.value)}
                  disabled={!!flaggedQuestions[currentIndex]}
                />
                {!flaggedQuestions[currentIndex] && (
                  <div className="flex gap-3 justify-end mt-4">
                    <NeonButton variant="secondary" size="sm" onClick={() => setIsFlagging(false)}>Cancel</NeonButton>
                    <NeonButton variant="primary" size="sm" onClick={submitFlag} className="bg-orange-500 hover:bg-orange-600 border-none text-white">Submit Flag</NeonButton>
                  </div>
                )}
                {!!flaggedQuestions[currentIndex] && (
                  <div className="mt-4 text-green-400 text-sm font-bold flex items-center gap-2">
                    <Sword className="w-4 h-4" /> Issue Reported
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {isAnswered && !flagged && (
              <div className="mt-8 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-[#0a0a16] border border-neon-blue/30 p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue"></div>
                  <h4 className="text-neon-blue font-bold uppercase text-xs mb-3 flex items-center gap-2"><Info className="w-4 h-4" /> AI Explanation</h4>
                  <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                      {currentQ.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </NeonCard>

          {/* Footer Navigation */}
          <div className="mt-6 flex justify-end">
            {(isAnswered || flaggedQuestions[currentIndex]) && (
              <NeonButton onClick={nextQuestion} glow className="px-8 h-12 text-lg">
                {currentIndex === questions.length - 1 ? "Finish Challenge" : "Next Challenge ->"}
              </NeonButton>
            )}
          </div>
        </div>
      );
    }

    // --- LANDING PAGE (HERO) ---
    return (
      <div className="max-w-5xl mx-auto">

        {/* Hero Section */}
        <div className="relative mb-12 text-center py-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
              <Sword className="w-4 h-4 text-neon-purple" />
              <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">Battle Mode Active</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 tracking-tight">
              AI Challenge <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-cyan">Arena</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Test your knowledge with adaptive AI-generated challenges. <br /> Flag issues, track progress, and master every topic.
            </p>
          </div>
        </div>

        {/* Input Card */}
        <div className="max-w-2xl mx-auto relative z-20 mb-16">
          <div className="absolute -inset-1 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-2xl blur opacity-30"></div>
          <NeonCard className="p-2 bg-[#0f1115] border-white/10 overflow-visible">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Target className="w-5 h-5" />
                </div>
                <input
                  value={config.topic}
                  onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  placeholder="Enter a topic to conquer (e.g. Thermodynamics)..."
                  className="w-full h-14 bg-transparent text-white pl-12 pr-4 text-lg font-medium outline-none placeholder:text-gray-600"
                />
              </div>
              <button
                onClick={() => startQuiz()}
                disabled={!config.topic.trim()}
                className="h-14 px-8 bg-white text-black font-bold text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Zap className="w-5 h-5" />
                Start
              </button>
            </div>
          </NeonCard>


        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button onClick={() => startQuiz("General Knowledge Mix")} className="group relative overflow-hidden rounded-2xl bg-[#1a1b26] border border-white/5 p-6 text-left hover:border-neon-purple/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-neon-purple/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shuffle className="w-6 h-6 text-neon-purple" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Surprise Me</h3>
            <p className="text-sm text-gray-400">Random topic mix</p>
          </button>

          <button onClick={() => startQuiz("Physics Mechanics")} className="group relative overflow-hidden rounded-2xl bg-[#1a1b26] border border-white/5 p-6 text-left hover:border-neon-cyan/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-neon-cyan/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-neon-cyan" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Brain Workout</h3>
            <p className="text-sm text-gray-400">Complex reasoning</p>
          </button>

          <button onClick={() => startQuiz("Exam Prep")} className="group relative overflow-hidden rounded-2xl bg-[#1a1b26] border border-white/5 p-6 text-left hover:border-orange-500/50 transition-all hover:-translate-y-1">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Exam Mode</h3>
            <p className="text-sm text-gray-400">Strict timing</p>
          </button>
        </div>

      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-screen">
      <div className="hidden lg:block lg:col-span-3">
        <NeonCard className="h-full p-0 overflow-hidden bg-black/20 backdrop-blur-xl border-white/5" glowColor="blue">
          <HistorySidebar
            studentId={studentId || ''}
            type="QUIZ"
            onSelect={handleHistorySelect}
            className="h-full border-none bg-transparent"
            contextClass={contextClass}
          />
        </NeonCard>
      </div>

      {/* MOBILE HISTORY DRAWER */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative w-80 h-full bg-[#0a0a0a] border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-4 flex justify-between items-center border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-neon-purple" /> History</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="h-[calc(100%-60px)] overflow-hidden">
              <HistorySidebar
                studentId={studentId || ''}
                type="QUIZ"
                onSelect={(item) => {
                  handleHistorySelect(item);
                  setShowHistory(false);
                }}
                className="h-full border-none bg-transparent"
                contextClass={contextClass}
              />
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-9 pt-4">
        {/* MOBILE TOGGLE BUTTON */}
        <div className="lg:hidden mb-4">
          <NeonButton onClick={() => setShowHistory(true)} variant="secondary" size="sm">
            <Menu className="w-4 h-4 mr-2" /> History
          </NeonButton>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};
