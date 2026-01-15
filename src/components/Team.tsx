import React from 'react';
import { ArrowLeft, Linkedin, Twitter, Github } from 'lucide-react';
import { LiquidBackground } from './LiquidBackground';
import { api } from '../services/api';
import { TeamMember } from '../types';

interface TeamProps {
    onBack: () => void;
}

export const Team: React.FC<TeamProps> = ({ onBack }) => {
    const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);

    React.useEffect(() => {
        const loadContent = async () => {
            try {
                const content = await api.getSiteContent();
                setTeamMembers(content.teamMembers || []);
            } catch (e) {
                console.error("Failed to load team content", e);
            }
        };
        loadContent();
    }, []);

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

                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold font-display mb-4 bg-clip-text text-transparent bg-gradient-to-r from-neon-purple to-pink-500">
                        Meet The Team
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        The minds building the future of education.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {teamMembers.map((member, idx) => (
                        <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-white/20 transition-all hover:-translate-y-2 group">
                            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-2 border-white/10 group-hover:border-neon-purple/50 transition-colors">
                                <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-2xl font-bold text-center mb-1">{member.name}</h3>
                            <p className="text-neon-cyan text-sm text-center font-bold tracking-wider mb-4 uppercase">{member.role}</p>
                            <p className="text-gray-400 text-center mb-6 text-sm leading-relaxed">
                                {member.bio}
                            </p>
                            <div className="flex justify-center gap-4">
                                <a href={member.socials.linkedin} className="text-gray-500 hover:text-white transition-colors"><Linkedin size={18} /></a>
                                <a href={member.socials.twitter} className="text-gray-500 hover:text-white transition-colors"><Twitter size={18} /></a>
                                <a href={member.socials.github} className="text-gray-500 hover:text-white transition-colors"><Github size={18} /></a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
