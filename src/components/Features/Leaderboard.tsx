import React from 'react';
import { NeonCard } from '../UIComponents';
import { Student } from '../../types';
import { Trophy, Medal, Crown } from 'lucide-react';

interface LeaderboardProps {
  students: Student[];
  className?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ students, className }) => {
  // Sort students by avgScore (descending)
  const sortedStudents = [...students].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="flex items-center justify-center gap-4 mb-8"><Crown className="w-10 h-10 text-yellow-400 animate-pulse" /><h2 className="text-3xl font-bold">Class Leaderboard</h2></div>
      <NeonCard glowColor="purple" className="p-0">
        <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 text-xs font-bold text-gray-400 uppercase"><div className="col-span-2 text-center">Rank</div><div className="col-span-6">Student</div><div className="col-span-4 text-right">Score</div></div>
        <div className="divide-y divide-white/5">
          {sortedStudents.map((student, index) => (
            <div key={student.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
              <div className="col-span-2 flex justify-center">
                {index === 0 ? <Trophy className="text-yellow-400" /> :
                  index === 1 ? <Medal className="text-gray-300" /> :
                    index === 2 ? <Medal className="text-amber-600" /> :
                      <span className="text-gray-500">#{index + 1}</span>}
              </div>
              <div className="col-span-6 font-bold text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center text-xs text-neon-purple">
                  {student.name.charAt(0)}
                </div>
                {student.name}
              </div>
              <div className="col-span-4 text-right text-neon-purple font-mono">{(student.avgScore || 0).toLocaleString()}</div>
            </div>
          ))}
          {sortedStudents.length === 0 && (
            <div className="p-8 text-center text-gray-500">No students in this class yet.</div>
          )}
        </div>
      </NeonCard>
    </div>
  );
};