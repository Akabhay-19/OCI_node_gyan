import React from 'react';
import { Zap, Brain, Trophy, BarChart3, Rocket, Check, ArrowRight, Users, School, BookOpen, Mic, Target, Shield, Activity, Moon, Globe } from 'lucide-react';
import { SelfDrawingHero } from './SelfDrawingHero';
import { LiquidBackground } from './LiquidBackground';



interface HomeProps {
    onGetStarted: () => void;
    onLogin: () => void;
    onDashboard: () => void;
    isLoggedIn: boolean;
    onDevConsole?: () => void;
    onNavigate?: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onGetStarted, onLogin, onDashboard, isLoggedIn, onDevConsole, onNavigate }) => {
    React.useEffect(() => {
        const hash = window.location.hash;
        if (hash) {
            const id = hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 500);
            }
        }
    }, []);

    return (
        <div className="flex flex-col gap-10 md:gap-20 pb-10 md:pb-20 hover-glow-text relative overflow-x-hidden">
            {/* <LiquidBackground /> Disabled for performance optimization */}

            {/* Hero Section */}
            <section className="relative min-h-[80vh] flex items-center justify-center text-center px-4">
                {/* ... existing hero background ... */}
                <div className="absolute inset-0 z-0">
                    <SelfDrawingHero />
                    <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-neon-purple/10 rounded-full blur-[180px] animate-breathe"></div>
                    <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-neon-cyan/10 rounded-full blur-[180px] animate-breathe" style={{ animationDelay: '4s' }}></div>
                </div>




                <div className="relative z-10 w-full space-y-12">
                    <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full glass-panel border border-neon-cyan/20 text-neon-cyan text-xs font-black tracking-[0.3em] uppercase animate-fade-in-up shadow-[0_0_20px_rgba(0,243,255,0.1)]">
                        <Zap className="w-4 h-4 animate-pulse" />
                        <span>QUANTUM INTELLIGENCE SYSTEM</span>
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-9xl font-display font-bold leading-none animate-fade-in-up tracking-tighter" style={{ animationDelay: '0.4s' }}>
                        Knowledge <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-br from-neon-cyan via-white to-neon-purple drop-shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all duration-500 hover:drop-shadow-[0_0_50px_rgba(188,19,254,0.6)]">
                            Evolved
                        </span>
                    </h1>

                    <p className="text-xl md:text-3xl text-gray-400 w-full leading-relaxed animate-fade-in-up font-light">
                        Step into the future of learning. An AI-powered ecosystem designed to maximize human potential through data-driven personalization.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 animate-fade-in-up pt-4" style={{ animationDelay: '1.2s' }}>
                        {isLoggedIn ? (
                            <button
                                onClick={onDashboard}
                                className="group relative px-12 py-6 bg-gradient-to-r from-neon-cyan to-neon-purple text-black font-black text-2xl rounded-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(0,243,255,0.6)] active:scale-95 shadow-lg"
                            >
                                <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                                <span className="relative flex items-center justify-center gap-4">
                                    CONTINUE TO DASHBOARD <Rocket className="w-8 h-8 animate-bounce" />
                                </span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={onGetStarted}
                                    className="group relative px-10 py-5 bg-neon-cyan text-black font-black text-xl rounded-2xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(0,243,255,0.5)] active:scale-95"
                                >
                                    <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 skew-x-12"></div>
                                    <span className="relative flex items-center justify-center gap-3">
                                        INITIATE LEARNING <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </button>

                                <button
                                    onClick={onLogin}
                                    className="group relative px-10 py-5 glass-panel border border-white/10 hover:border-neon-purple/50 text-white font-black text-xl rounded-2xl transition-all hover:bg-neon-purple/10 hover:scale-105 active:scale-95 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-neon-purple/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative">RESTORE SESSION</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Tech Stack Strip */}
            <div className="w-full border-y border-white/5 bg-black/20 backdrop-blur-sm py-8 overflow-hidden">
                <div className="text-center mb-8">
                    <span className="text-gray-400 text-sm font-bold tracking-[0.2em] uppercase">Powered By</span>
                </div>
                <div className="relative w-full overflow-hidden">
                    <div className="flex items-center justify-around min-w-full gap-16 animate-marquee">
                        <div className="flex items-center gap-3">
                            {/* Google G Logo */}
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="font-bold text-xl text-white">Google Cloud</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Gemini Sparkle Icon */}
                            <svg className="w-8 h-8 text-blue-400 animate-spin-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#gemini-gradient)" stroke="white" strokeWidth="1" />
                                <defs>
                                    <linearGradient id="gemini-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#4facfe" />
                                        <stop offset="1" stopColor="#00f2fe" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Gemini AI</span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* React Logo */}
                            <svg className="w-8 h-8 text-cyan-400 animate-spin-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="2" fill="currentColor" />
                                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" transform="rotate(0 12 12)" />
                                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 12 12)" />
                                <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 12 12)" />
                            </svg>
                            <span className="font-bold text-xl text-cyan-400">React</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Immersive Learning Section */}
            <section id="features" className="w-full py-10">
                <div className="w-full text-center mb-16 px-4">
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-green-400">
                            Immersive Learning
                        </span>
                    </h2>
                    <p className="text-gray-400 w-full text-xl leading-relaxed">
                        Forget boring textbooks. Dive into a learning experience that adapts to you.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <FeatureCard
                        icon={<Brain className="w-8 h-8 text-neon-cyan" />}
                        title="Adaptive AI Tutor"
                        description="A personal tutor that understands your weak spots and creates custom study plans just for you."
                        delay="1.5s"
                        className="animate-fade-in-up"
                    />
                    <FeatureCard
                        icon={<BookOpen className="w-8 h-8 text-neon-purple" />}
                        title="Story Mode"
                        description="Learn complex concepts through interactive narratives and adventures. History and Science come alive."
                        delay="1.7s"
                        className="animate-fade-in-up"
                    />
                    <FeatureCard
                        icon={<Mic className="w-8 h-8 text-pink-500" />}
                        title="Voice Tutor"
                        description="Practice languages or ask questions naturally. Our AI speaks your language, literally."
                        delay="1.9s"
                        className="animate-fade-in-up"
                    />
                    <FeatureCard
                        icon={<Target className="w-8 h-8 text-yellow-400" />}
                        title="Smart Quizzes"
                        description="AI-generated quizzes that test your true understanding, not just memorization."
                        delay="2.1s"
                        className="animate-fade-in-up"
                    />
                </div>
            </section>

            {/* Gamification Section */}
            <section id="gamification" className="w-full py-10">
                <div className="glass-panel border border-neon-purple/30 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-neon-purple/10 to-transparent pointer-events-none"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/20 text-neon-purple text-xs font-bold uppercase tracking-wider mb-6">
                                <Trophy className="w-4 h-4" /> Gamified Ecosystem
                            </div>
                            <h2 className="text-4xl font-display font-bold mb-6">Level Up Your Knowledge</h2>
                            <p className="text-gray-300 mb-8 leading-relaxed">
                                Learning shouldn't be a chore. Earn XP for every lesson, unlock exclusive badges, and compete on global leaderboards. Watch your rank rise as your knowledge grows.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple"><Shield className="w-4 h-4" /></div>
                                    <span>Earn badges for streaks and mastery</span>
                                </li>
                                <li className="flex items-center gap-3 text-gray-400">
                                    <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple"><Activity className="w-4 h-4" /></div>
                                    <span>Track your daily learning velocity</span>
                                </li>
                            </ul>
                        </div>
                        <div className="relative flex justify-center items-center h-full min-h-[300px]">
                            {/* Globe Visualization */}


                            {/* Floating Stats Cards */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="grid grid-cols-2 gap-24 w-full px-8">
                                    <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col items-center text-center transform -translate-y-12 animate-float-slow backdrop-blur-sm bg-black/40">
                                        <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
                                        <div className="text-xs font-bold text-gray-300">Global Rank</div>
                                        <div className="text-xl font-display text-yellow-500">#42</div>
                                    </div>
                                    <div className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col items-center text-center transform translate-y-12 animate-float-slow backdrop-blur-sm bg-black/40" style={{ animationDelay: '1.5s' }}>
                                        <Zap className="w-8 h-8 text-neon-cyan mb-2" />
                                        <div className="text-xs font-bold text-gray-300">Total XP</div>
                                        <div className="text-xl font-display text-neon-cyan">12,500</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Empowerment Tools Section */}
            <section id="empowerment" className="w-full py-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                            Empowerment Tools
                        </span>
                    </h2>
                    <p className="text-gray-400 w-full">
                        Powerful dashboards for Teachers, Schools, and Parents to track and guide progress.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
                    <FeatureCard
                        icon={<Users className="w-8 h-8 text-blue-400" />}
                        title="Teacher Dashboard"
                        description="Manage classes, assign AI-graded homework, and view real-time analytics on student performance."
                        detailedDescription="Streamline your classroom with automated attendance, AI-assisted grading for both objective and subjective assessments, and real-time behavioral analytics. Identify at-risk students before they fall behind and generate personalized lesson plans in seconds."
                        delay="0s"
                        className="flex-1 transition-transform duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:z-10 hover:shadow-[0_20px_50px_rgba(59,130,246,0.5)]"
                    />
                    <FeatureCard
                        icon={<School className="w-8 h-8 text-indigo-400" />}
                        title="School Management"
                        description="Oversee the entire institution. Track attendance, faculty performance, and curriculum progress."
                        detailedDescription="Gain a 360-degree view of your institution. Monitor faculty performance, track curriculum progress across all grades, manage subscriptions, and ensure compliance with educational standards—all from a single, intuitive command center."
                        delay="0.1s"
                        className="flex-1 transition-transform duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:z-10 hover:shadow-[0_20px_50px_rgba(99,102,241,0.5)]"
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-8 h-8 text-teal-400" />}
                        title="Parent Insights"
                        description="Stay in the loop with your child's learning journey. View strengths, weaknesses, and activity reports."
                        detailedDescription="Bridge the gap between home and school. Receive instant notifications on attendance and achievements, view detailed breakdown of your child's strengths and weaknesses, and get AI-driven recommendations to support their learning journey at home."
                        delay="0.2s"
                        className="flex-1 transition-transform duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:z-10 hover:shadow-[0_20px_50px_rgba(45,212,191,0.5)]"
                    />
                </div>
            </section>

            {/* Pricing Plans */}
            <section id="pricing" className="w-full py-20">
                <h2 className="w-full text-4xl md:text-5xl font-display font-bold text-center mb-6">
                    Simple, Transparent Pricing
                </h2>
                <p className="w-full text-gray-400 text-center mb-16 text-xl leading-relaxed">
                    Start for free and scale as you grow. Whether you're a student, teacher, or an entire institution.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                    <PricingCard
                        title="Student Starter"
                        price="Free"
                        features={['Access to basic courses', 'Daily AI hints', 'Community support', 'Basic progress tracking']}
                        cta="Start Learning"
                        onClick={onGetStarted}
                    />
                    <PricingCard
                        title="Pro Scholar"
                        price="Custom"
                        isPopular
                        features={['Unlimited AI Tutoring', 'Advanced Analytics', 'Priority Support', 'Exclusive Content', 'Downloadable Resources']}
                        cta="Go Pro"
                        onClick={onGetStarted}
                    />
                    <PricingCard
                        title="Institution"
                        price="Custom"
                        features={['School-wide Dashboard', 'Teacher Management', 'Bulk Student Import', 'Custom Curriculum', 'API Access']}
                        cta="Contact Sales"
                        onClick={() => window.location.href = 'mailto:sales@gyan.edu'}
                    />
                </div>
            </section>

            {/* CTA Section */}
            <section className="w-full mb-20">
                <div className="glass-panel border border-neon-cyan/20 rounded-3xl p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10"></div>

                    <div className="relative z-10 text-center md:text-left w-full">
                        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 md:mb-6">
                            {isLoggedIn ? "Welcome Back to Your Journey" : "Ready to Transform Your Future?"}
                        </h2>
                        <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-8">
                            {isLoggedIn
                                ? "Resume your progress and reach your goals with AI-powered personalized insights."
                                : "Join thousands of students and teachers who are already experiencing the power of Gyan."
                            }
                        </p>
                        <button
                            onClick={isLoggedIn ? onDashboard : onGetStarted}
                            className="w-full md:w-auto px-10 py-4 bg-white text-black font-bold text-xl rounded-xl hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            {isLoggedIn ? "Go to Dashboard" : "Join Now - It's Free"}
                        </button>
                    </div>


                </div>
            </section>

            {/* Footer Links */}
            <footer className="w-full py-8 border-t border-white/5 text-center md:text-left">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-gray-500 text-sm">© 2026 Gyan AI. All rights reserved.</p>
                    <div className="flex gap-8">
                        <button onClick={() => onNavigate?.('ABOUT')} className="text-gray-400 hover:text-white transition-colors text-sm">About Us</button>
                        <button onClick={() => onNavigate?.('TEAM')} className="text-gray-400 hover:text-white transition-colors text-sm">Team</button>
                        <button onClick={() => onNavigate?.('CONTACT')} className="text-gray-400 hover:text-white transition-colors text-sm">Contact</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string, detailedDescription?: string, delay: string, className?: string, style?: React.CSSProperties }> = ({ icon, title, description, detailedDescription, delay, className, style }) => (
    <div
        className={`glass-panel p-8 rounded-2xl border border-white/5 hover:border-neon-cyan/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] group h-full relative overflow-hidden ${className || ''}`}
        style={{ animationDelay: delay, ...style }}
    >
        <div className="relative z-10 h-full flex flex-col">
            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-neon-cyan/50">
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-4 group-hover:text-neon-cyan transition-colors">{title}</h3>
            <p className="text-gray-400 leading-relaxed flex-grow">
                {description}
            </p>
        </div>

        {detailedDescription && (
            <div className="absolute inset-0 bg-[#0a0f1e]/95 backdrop-blur-md p-8 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 translate-y-full group-hover:translate-y-0">
                <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 flex items-center justify-center mb-4 text-neon-cyan">
                    {icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-neon-cyan">{title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                    {detailedDescription}
                </p>
            </div>
        )}
    </div>
);

const PricingCard: React.FC<{ title: string, price: string, features: string[], cta: string, isPopular?: boolean, onClick: () => void }> = ({ title, price, features, cta, isPopular, onClick }) => (
    <div className={`relative glass-panel p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-2 flex flex-col ${isPopular ? 'border-neon-cyan shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'border-white/10 hover:border-white/30'}`}>
        {isPopular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-neon-cyan text-black text-xs font-bold uppercase tracking-widest rounded-full">
                Most Popular
            </div>
        )}
        <h3 className="text-xl font-bold text-gray-300 mb-2">{title}</h3>
        <div className="text-4xl font-display font-bold mb-6">{price}</div>
        <ul className="space-y-4 mb-8 flex-grow">
            {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-400 text-sm">
                    <Check className="w-5 h-5 text-neon-cyan shrink-0" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
        <button
            onClick={onClick}
            className={`w-full py-3 rounded-lg font-bold transition-all ${isPopular ? 'bg-neon-cyan text-black hover:bg-cyan-300' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
            {cta}
        </button>
    </div>
);
