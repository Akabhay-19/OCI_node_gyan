import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { NeonCard, NeonButton, Input } from '../UIComponents';
import { HistorySidebar } from './HistorySidebar';
import { api, DEFAULT_MODEL } from '../../services/api';
import { StoryResponse } from '../../types';
import { BookOpen, Sparkles, Feather, Rocket, AlertTriangle, Volume2, Square, Menu, History, XCircle } from 'lucide-react';

export const StoryMode: React.FC<{ studentId?: string, initialStory?: StoryResponse, contextClass?: any }> = ({ studentId, initialStory, contextClass }) => {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState(contextClass?.subject || 'Science'); // Default subject
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyData, setStoryData] = useState<StoryResponse | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  const [showHistory, setShowHistory] = useState(false);



  React.useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // [NEW] Load initial story
  React.useEffect(() => {
    if (initialStory) {
      setStoryData(initialStory);
      if (initialStory.title) setTopic(initialStory.title.replace('The Story of ', ''));
    }
  }, [initialStory]);

  // Update subject if context changes
  React.useEffect(() => {
    if (contextClass?.subject) setSubject(contextClass.subject);
  }, [contextClass]);

  const handleNarrate = () => {
    if (!storyData?.story) return;

    // Stop excessive clicking or overlaps
    window.speechSynthesis.cancel();

    // Use plain text for narration, strip markdown
    const plainText = storyData.story.replace(/[*_~`]/g, '');
    const utterance = new SpeechSynthesisUtterance(plainText);

    // Attempt to set a better voice/lang matches
    if (language === 'Hindi' || language === 'Hinglish') {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onstart = () => {
      console.log("Narration started...");
      setIsNarrating(true);
    };

    utterance.onend = () => {
      console.log("Narration ended.");
      setIsNarrating(false);
    };

    utterance.onerror = (event) => {
      console.error("Narration error:", event);
      setIsNarrating(false);
    };

    // Store in ref to prevent garbage collection which prematurely stops audio in some browsers
    utteranceRef.current = utterance;

    window.speechSynthesis.speak(utterance);
    // Force state just in case onstart lags
    setIsNarrating(true);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsNarrating(false);
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setStoryData(null);
    setError(null);
    setError(null);
    try {
      const data = await api.generateStory(
        topic,
        subject,
        contextClass?.grade || "Grade 5",
        language,
        studentId,
        contextClass?.id // [UPDATED] Pass classId
      );
      setStoryData(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Story generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* HISTORY SIDEBAR */}
      <div className="hidden lg:block lg:col-span-2">
        <NeonCard className="h-full p-0 overflow-hidden" glowColor="cyan">
          <HistorySidebar
            studentId={studentId || ''}
            type="STORY"
            onSelect={(item) => setStoryData(item.content)}
            className="h-full border-none bg-transparent"
            contextClass={contextClass}
          />
        </NeonCard>
      </div>

      {/* MOBILE HISTORY TOGGLE */}
      <div className="lg:hidden col-span-1">
        <NeonButton onClick={() => setShowHistory(true)} variant="secondary" size="sm" className="mb-4">
          <Menu className="w-4 h-4 mr-2" /> History
        </NeonButton>
      </div>

      {/* MOBILE DRAWER */}
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
                type="STORY"
                onSelect={(item) => {
                  setStoryData(item.content);
                  setShowHistory(false);
                }}
                className="h-full border-none bg-transparent"
                contextClass={contextClass}
              />
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <NeonCard glowColor="purple">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-neon-purple" /> Story Mode
            </h3>

            {/* Model Selector */}


            <label className="text-gray-400 text-sm mb-1 block">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-black/50 border border-neon-purple/30 rounded p-2 text-white mb-4 focus:outline-none focus:border-neon-purple"
            >
              <option value="Science">Science</option>
              <option value="History">History</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Literature">Literature</option>
              <option value="Geography">Geography</option>
              <option value="Computer Science">Computer Science</option>
            </select>

            <label className="text-gray-400 text-sm mb-1 block">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-black/50 border border-neon-purple/30 rounded p-2 text-white mb-4 focus:outline-none focus:border-neon-purple"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Hinglish">Hinglish</option>
            </select>

            <label className="text-gray-400 text-sm mb-1 block">Topic</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (e.g. Gravity)..." className="mb-4" />
            <NeonButton onClick={handleGenerate} isLoading={loading} className="w-full" glow variant="primary"><Feather className="w-4 h-4 mr-2" /> Weave Story</NeonButton>
            {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}
          </NeonCard>
        </div>
        <div className="lg:col-span-8">
          {storyData ? (
            <NeonCard glowColor="cyan" className="min-h-[500px]">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-display font-bold text-white">{storyData.title}</h2>
                <NeonButton
                  onClick={isNarrating ? handleStop : handleNarrate}
                  variant={isNarrating ? "danger" : "secondary"}
                  className="!py-2"
                >
                  {isNarrating ? <><Square className="w-4 h-4 mr-2" /> Stop</> : <><Volume2 className="w-4 h-4 mr-2" /> Narrate</>}
                </NeonButton>
              </div>
              <div className="prose prose-invert max-w-none mb-8">
                <div className="text-lg text-gray-300 leading-relaxed font-serif">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                    components={{
                      p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                    }}
                  >
                    {(() => {
                      let content = storyData.story || "";
                      // [SAFEGUARD] Strip markdown code blocks if AI wraps the entire content
                      if (content.startsWith("```") && content.endsWith("```")) {
                        content = content.replace(/^```(markdown|json)?/i, "").replace(/```$/, "").trim();
                      }
                      content = content.replace(/```markdown/gi, "").replace(/```/g, "");

                      // [FIX] Replace literal "\n" strings with actual newlines
                      content = content.replace(/\\n/g, "\n");
                      return content;
                    })()}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">{storyData.keyConcepts.map((c, i) => <span key={i} className="px-3 py-1 bg-neon-cyan/10 text-neon-cyan rounded-full text-sm">{c}</span>)}</div>
            </NeonCard>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl bg-black/20">
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="animate-pulse">Writing story...</p>
                </div>
              ) : (
                <>
                  <Rocket className="w-16 h-16 mb-4 opacity-20" />
                  <p>Ready to start the adventure...</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
