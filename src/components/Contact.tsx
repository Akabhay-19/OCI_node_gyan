import React, { useState } from 'react';
import { ArrowLeft, Mail, MapPin, Phone, Send } from 'lucide-react';
import { LiquidBackground } from './LiquidBackground';

interface ContactProps {
    onBack: () => void;
}

export const Contact: React.FC<ContactProps> = ({ onBack }) => {
    const [formState, setFormState] = useState({ name: '', email: '', message: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Message sent! We will get back to you shortly.");
        // Implement actual sending logic here
        setFormState({ name: '', email: '', message: '' });
    };

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

                <h1 className="text-5xl font-bold font-display text-center mb-16 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-neon-cyan">
                    Get in Touch
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <div className="glass-panel p-8 rounded-2xl border border-white/10">
                            <h3 className="text-2xl font-bold mb-6">Contact Information</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <Mail className="text-neon-cyan mt-1" />
                                    <div>
                                        <p className="font-bold text-gray-300">Email Us</p>
                                        <p className="text-gray-500">support@gyan.ai</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Phone className="text-neon-purple mt-1" />
                                    <div>
                                        <p className="font-bold text-gray-300">Call Us</p>
                                        <p className="text-gray-500">+91 98765 43210</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <MapPin className="text-pink-500 mt-1" />
                                    <div>
                                        <p className="font-bold text-gray-300">Visit Us</p>
                                        <p className="text-gray-500">123 Innovation Drive,<br />Tech Park, Bangalore, India</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-neon-cyan/5 to-transparent">
                            <h3 className="text-xl font-bold mb-2">Join the Community</h3>
                            <p className="text-gray-400 text-sm mb-4">Follow us on social media for updates and learning tips.</p>
                            {/* Social Icons could go here */}
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="glass-panel p-8 rounded-2xl border border-white/10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Your Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-4 focus:border-neon-cyan focus:outline-none text-white transition-colors"
                                    placeholder="John Doe"
                                    value={formState.name}
                                    onChange={e => setFormState({ ...formState, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-4 focus:border-neon-cyan focus:outline-none text-white transition-colors"
                                    placeholder="john@example.com"
                                    value={formState.email}
                                    onChange={e => setFormState({ ...formState, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Message</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-4 focus:border-neon-cyan focus:outline-none text-white transition-colors resize-none"
                                    placeholder="How can we help you?"
                                    value={formState.message}
                                    onChange={e => setFormState({ ...formState, message: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <Send size={20} /> Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
