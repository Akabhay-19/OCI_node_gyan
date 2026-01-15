import React from 'react';
import { ArrowLeft, Shield, Users, Globe, BookOpen } from 'lucide-react';
import { LiquidBackground } from './LiquidBackground';

interface AboutUsProps {
    onBack: () => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            <LiquidBackground />

            <div className="relative z-10 container mx-auto px-4 py-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft size={20} /> Back to Home
                </button>

                <div className="max-w-4xl mx-auto">
                    <h1 className="text-5xl font-bold font-display mb-8 bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
                        About Gyan AI
                    </h1>

                    <div className="glass-panel p-8 rounded-2xl border border-white/10 mb-12">
                        <p className="text-xl text-gray-300 leading-relaxed mb-6">
                            Gyan AI is at the forefront of the educational revolution, merging advanced artificial intelligence with immersive gamification to create a learning experience that truly adapts to every student.
                        </p>
                        <p className="text-lg text-gray-400 leading-relaxed">
                            Our mission is to democratize quality education by providing a personalized, engaging, and effective platform that empowers students to reach their full potential, regardless of their background or learning style.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-panel p-6 rounded-xl border border-white/5">
                            <Shield className="w-10 h-10 text-neon-cyan mb-4" />
                            <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                            <p className="text-gray-400">Your data is yours. We prioritize privacy and security above all else.</p>
                        </div>
                        <div className="glass-panel p-6 rounded-xl border border-white/5">
                            <Users className="w-10 h-10 text-neon-purple mb-4" />
                            <h3 className="text-xl font-bold mb-2">Student Centric</h3>
                            <p className="text-gray-400">Every feature is designed with the student's success in mind.</p>
                        </div>
                        <div className="glass-panel p-6 rounded-xl border border-white/5">
                            <Globe className="w-10 h-10 text-blue-400 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Global Vision</h3>
                            <p className="text-gray-400">Connecting knowledge across borders and breaking down barriers.</p>
                        </div>
                        <div className="glass-panel p-6 rounded-xl border border-white/5">
                            <BookOpen className="w-10 h-10 text-green-400 mb-4" />
                            <h3 className="text-xl font-bold mb-2">Deep Learning</h3>
                            <p className="text-gray-400">Beyond memorization—we foster true understanding and critical thinking.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
