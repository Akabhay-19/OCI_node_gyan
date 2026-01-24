
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Wifi, WifiOff, Menu, X, Home, User, Settings, LogOut, BookOpen, Layers, Users, Calendar, ClipboardList, Trophy, FileText, Briefcase, Brain, School, LayoutDashboard, Megaphone } from 'lucide-react';
import logoNew from '../assets/logo-new.png';


import { api } from '../services/api';
import { UserRole, Student, Teacher, Parent } from '../types';

import { UserProfileModal } from './UserProfileModal';

interface LayoutProps {
  children: React.ReactNode;
  logoUrl?: string;
  userRole?: UserRole | null;
  currentUser?: Student | Teacher | Parent;
  onLogout?: () => void;
  onUpdateUser?: (updatedUser: any) => void;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
  hideHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, logoUrl, userRole, currentUser, onLogout, onUpdateUser, hideHeader = false, activeTab, onNavigate }) => {
  const [scrollFlash, setScrollFlash] = useState(false);
  const [isAiOnline, setIsAiOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const lastScrollY = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnection = async () => {
    setIsChecking(true);
    const online = await api.checkSystemHealth();
    setIsAiOnline(online);
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 60000); // Check every minute

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollY.current);
      if (delta > 50) {
        setScrollFlash(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setScrollFlash(false), 300);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // --- MENU ITEMS CONFIG ---
  const getMenuItems = () => {
    const scrollToSection = (id: string) => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
      }
    };

    // Helper to request navigation from parent app
    const navigate = (tab: string) => {
      if (onNavigate) onNavigate(tab);
      setIsMenuOpen(false);
    };

    const commonItems = [
      { label: 'Home', icon: Home, action: () => { navigate('HOME'); } },
    ];

    if (!userRole) {
      return [
        ...commonItems,
        { label: 'Features', icon: Brain, action: () => scrollToSection('features') },
        { label: 'Gamification', icon: Trophy, action: () => scrollToSection('gamification') },
        { label: 'For Schools', icon: School, action: () => scrollToSection('empowerment') },
        { label: 'Pricing', icon: Zap, action: () => scrollToSection('pricing') },
      ];
    }

    let roleItems: any[] = [];
    if (userRole === 'STUDENT') {
      roleItems = [
        { label: 'My Profile', icon: User, action: () => { setShowProfileModal(true); setIsMenuOpen(false); } },
        { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('LEARN') },
        { label: 'Assignments', icon: ClipboardList, action: () => navigate('ASSIGNMENTS') },
        { label: 'Mind Maps', icon: Brain, action: () => navigate('MINDMAP') },
        { label: 'Quizzes', icon: Trophy, action: () => navigate('PRACTICE') },
        { label: 'Leaderboard', icon: Trophy, action: () => navigate('LEADERBOARD') },
        { label: 'Remedial', icon: Layers, action: () => navigate('REMEDIAL') },
      ];
    } else if (userRole === 'TEACHER') {
      roleItems = [
        { label: 'My Profile', icon: User, action: () => { setShowProfileModal(true); setIsMenuOpen(false); } },
        { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('HOME') },
        { label: 'My Classes', icon: Users, action: () => navigate('CLASSES') },
        { label: 'Assignments', icon: ClipboardList, action: () => navigate('ASSIGNMENTS') },
        { label: 'Attendance', icon: Calendar, action: () => navigate('ATTENDANCE') },
        { label: 'Gradebook', icon: BookOpen, action: () => navigate('GRADEBOOK') },
      ];
    } else if (userRole === 'ADMIN') {
      roleItems = [
        { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('HOME') },
        { label: 'Classes', icon: Briefcase, action: () => navigate('CLASSES') },
        { label: 'Teachers', icon: Users, action: () => navigate('TEACHERS') },
        { label: 'Students', icon: Users, action: () => navigate('STUDENTS') },
        { label: 'Announcements', icon: Megaphone, action: () => navigate('ANNOUNCEMENTS') },
        { label: 'Leaderboard', icon: Trophy, action: () => navigate('LEADERBOARD') },
      ];
    }

    return [...commonItems, ...roleItems];
  };


  return (
    <div className="min-h-screen relative font-sans text-gray-100 selection:bg-neon-cyan selection:text-black">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 bg-dark-bg">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 bg-neon-purple/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-1/2 h-1/2 bg-neon-cyan/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className={`lightning-flash ${scrollFlash ? 'animate-flash' : ''}`}></div>

      {showProfileModal && currentUser && (
        <UserProfileModal
          user={currentUser}
          role={userRole || undefined}
          onClose={() => setShowProfileModal(false)}
          onUpdateUser={(updated) => {
            if (onUpdateUser) onUpdateUser(updated);
            setShowProfileModal(false);
          }}
        />
      )}

      {/* --- SIDEBAR DRAWER --- */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMenu}></div>
        <div className={`absolute top-0 left-0 w-80 h-full bg-[#0f1115] border-r border-white/10 shadow-2xl transform transition-transform duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* Menu Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h2 className="text-xl font-display font-bold text-white tracking-widest">MENU</h2>
            <button onClick={toggleMenu} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info (if logged in) */}
          {currentUser && (
            <div className="p-6 bg-gradient-to-r from-neon-purple/10 to-transparent border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{currentUser.name}</h3>
                  <span className="text-xs font-bold text-neon-cyan px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 mt-1 inline-block">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {getMenuItems().map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 data-[active=true]:bg-neon-purple/20 data-[active=true]:text-neon-purple text-gray-400 hover:text-white transition-all group"
              >
                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-medium tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
            {/* AI Status in Menu */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
              <span className="text-xs text-gray-400 font-bold uppercase">AI System</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAiOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
                <span className={`text-xs font-bold ${isAiOnline ? 'text-green-500' : 'text-red-500'}`}>{isAiOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>

            {onLogout && userRole && (
              <button onClick={() => { toggleMenu(); onLogout(); }} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all font-bold text-sm">
                <LogOut className="w-4 h-4" />
                LOGOUT
              </button>
            )}
          </div>
        </div>
      </div>


      <main className="relative z-10 flex flex-col min-h-screen">
        {/* Header - Conditionally rendered */}
        {!hideHeader && (
          <header className="p-6 flex justify-between items-center glass-panel sticky top-0 z-50 border-b border-white/5">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={toggleMenu}
                className="p-2 -ml-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              <div className="flex items-center gap-2 md:gap-3">
                {logoUrl ? (
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg overflow-hidden border border-neon-cyan/50 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    <img src={logoUrl} alt="School Logo" className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div>
                  <img src={logoNew} alt="Gyan AI" className="h-10 md:h-16 lg:h-20 w-auto object-contain logo-glow" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* [NEW] Home Navigation Links - Moved to Right */}
              {(!userRole || activeTab === 'HOME') && (
                <div className="hidden md:flex items-center gap-6 mr-4">
                  <button onClick={() => onNavigate?.('ABOUT')} className="text-gray-400 hover:text-white hover:text-neon-cyan transition-colors text-sm font-bold tracking-wide">About Us</button>
                  <button onClick={() => onNavigate?.('TEAM')} className="text-gray-400 hover:text-white hover:text-neon-cyan transition-colors text-sm font-bold tracking-wide">Team</button>
                  <button onClick={() => onNavigate?.('CONTACT')} className="text-gray-400 hover:text-white hover:text-neon-cyan transition-colors text-sm font-bold tracking-wide">Contact</button>
                </div>
              )}

              <div className="hidden md:block text-right">
                <div className="text-xs text-gray-500 font-mono">v3.2.0-beta</div>
                <div className="text-[10px] text-neon-cyan uppercase tracking-widest font-bold">System Active</div>
              </div>

              {/* Small status dot if not in menu */}
              <div
                className={`w-2 h-2 rounded-full ${isAiOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
                title={isAiOnline ? "AI Online" : "AI Offline"}
              ></div>
            </div>
          </header>
        )}

        <div className="flex-grow container mx-auto px-4 py-6 md:py-12">
          {children}
        </div>

        <footer className="p-6 text-center text-gray-600 text-sm border-t border-white/5 glass-panel flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 relative">
          <div className="flex flex-col items-center md:items-start">
            <p>&copy; 2025 Gyan EdTech. <span className="block md:inline md:ml-2">Powered by <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 font-bold">Google Gemini</span></span></p>
          </div>
          <div className="flex items-center gap-2 text-xs md:relative md:right-0">
            {isAiOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
            <span className={isAiOnline ? 'text-green-500' : 'text-red-500'}>
              {isAiOnline ? 'Connected to Gemini' : 'Check API Key Configuration'}
            </span>
          </div>
        </footer>
      </main>
    </div >
  );
};
