import React, { useState, useEffect } from 'react';
import { UserRole, SchoolProfile } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { School, ScanLine, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';

interface SchoolJoinProps {
  role: UserRole | null;
  availableSchools: SchoolProfile[];
  onJoinSchool: (schoolId: string) => void;
  onBack: () => void;
  isLocked?: boolean;
  tempStudentName?: string;
  prefilledCode?: string;
}

export const SchoolJoin: React.FC<SchoolJoinProps> = ({ role, availableSchools, onJoinSchool, onBack, isLocked = false, tempStudentName, prefilledCode }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (prefilledCode) setCode(prefilledCode); }, [prefilledCode]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const school = availableSchools.find(s => (s.inviteCode || '').toUpperCase() === code.trim().toUpperCase());
    if (!school) setError("Invalid Code");
    else if (isLocked) setError("Locked");
    else onJoinSchool(school.id);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 w-full relative"><NeonButton variant="ghost" onClick={onBack} className="absolute top-0 right-4 md:right-8"><ArrowLeft className="w-4 h-4" /> Back</NeonButton><NeonCard glowColor={error ? "red" : "purple"} className="p-8 w-full max-w-md"><div className="text-center mb-6"><School className="w-16 h-16 mx-auto text-neon-purple mb-4" /><h2 className="text-3xl font-bold text-white">Join Institution</h2></div>{error && <div className="text-red-400 text-center mb-4 font-bold">{error}</div>}<form onSubmit={handleJoin} className="space-y-6"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter Code (e.g. NEBULA-2025)" className="text-center text-xl tracking-widest uppercase" /><NeonButton type="submit" className="w-full" glow={!isLocked} variant={isLocked ? 'danger' : 'primary'} disabled={code.length < 3}>{isLocked ? "Locked" : "Sync & Join"}</NeonButton></form></NeonCard></div>
  );
};