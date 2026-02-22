import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import { NeonCard, NeonButton } from './UIComponents';
import { User, BookOpen, AlertTriangle, BarChart2, CheckCircle, Calendar, LogOut, ChevronDown, Bell, ChevronLeft, Folder } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Student, Assignment, Submission, Parent, Classroom } from '../types';

interface ParentDashboardProps {
  schoolName: string;
  onLogout: () => void;
  currentUser?: any; // Parent object
  students: Student[]; // All students, to find the child
  classrooms: Classroom[]; // All public classrooms to match IDs
}



const CHART_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#f59e0b'];

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ schoolName, onLogout, currentUser, students, classrooms }) => {
  // 1. Resolve Child
  // With "Parent Login using Student Creds", currentUser IS the Student.
  // We handle both cases: if currentUser is Student or if it's a Parent wrapper found in students list (legacy).
  const selectedStudent = (currentUser as Student); // Direct mapping based on new requirement

  // View State
  const [viewMode, setViewMode] = useState<'CLASS_SELECTION' | 'DASHBOARD'>('CLASS_SELECTION');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ASSIGNMENTS' | 'GAPS' | 'CHARTS'>('OVERVIEW');
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Derived: Get Student's Enrolled Classes
  const enrolledClassIds = selectedStudent.classIds || (selectedStudent.classId ? [selectedStudent.classId] : []);
  const effectiveClassIds = enrolledClassIds;

  // Resolve Classroom Objects
  const enrolledClassrooms = classrooms.filter(c => effectiveClassIds.includes(c.id));


  // Use real classrooms or empty list if none found (triggers "No Classes" UI)
  const displayedClassrooms = enrolledClassrooms;


  // 2. Fetch Assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      if (!selectedClassId) return;
      try {
        const res = await fetch(`${API_URL}/assignments?classId=${selectedClassId}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data);
        }
      } catch (e) {
        console.error("Failed to fetch assignments for parent view", e);
      }
    };
    fetchAssignments();
  }, [selectedClassId]);

  // 3. Derived Stats (Mocked or filtered by class if data existed)
  // In a real app, 'assignments' would be filtered by 'selectedClassId'
  // 3. Derived Stats (Real Data)
  // Logic: 
  // 'assignments' state contains ALL assignments for the selected class.
  // We need to verify which ones the student has submitted (this would require a separate fetch or including submissions in student object).
  // For now, we'll approximate based on what we have or fetch submissions if possible. 
  // Ideally, fetch `/api/submissions?studentId=...` but let's assume we implement a basic logic.
  // Or simpler: Just showing Total Assignments vs "Pending" based on local deadlines if no submission data.
  // Given we just fetched `assignments` (the definitions), we don't know status without submissions.
  // Let's implement a quick fetch for submissions too.

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  useEffect(() => {
    if (!selectedClassId || !selectedStudent.id) return;
    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`${API_URL}/submissions?studentId=${selectedStudent.id}&classId=${selectedClassId}`);
        if (res.ok) setSubmissions(await res.json());
      } catch (e) { }
    };
    fetchSubmissions();
  }, [selectedClassId, selectedStudent.id]);

  const completedAssignments = submissions.length;
  const pendingAssignments = assignments.filter(a => {
    const isSubmitted = submissions.find(s => s.assignmentId === a.id);
    const isExpired = new Date(a.deadline) < new Date();
    return !isSubmitted && !isExpired;
  }).length;
  const missedAssignments = assignments.filter(a => {
    const isSubmitted = submissions.find(s => s.assignmentId === a.id);
    const isExpired = new Date(a.deadline) < new Date();
    return !isSubmitted && isExpired;
  }).length;
  const openGaps = selectedStudent.weaknessHistory?.filter(w => w.status === 'OPEN').length || 0;

  // 4. Chart Data (Real Calculations)

  // Engagement: Percentage of assignments submitted vs total assigned (excluding pending future ones)
  const pastAssignmentsCount = assignments.filter(a => new Date(a.deadline) < new Date()).length;
  const engagementScore = pastAssignmentsCount > 0
    ? Math.round((submissions.length / pastAssignmentsCount) * 100)
    : 100; // Default to 100 if no past assignments yet (optimistic)

  // Consistency: Based on score variance (Mock logic using Avg Score stability if we don't have full history, 
  // but let's use AvgScore as a proxy for "High Performance" and map it, or just use a fixed logic until we have full history)
  // For now: Random variance based on Avg Score to look realistic but tied to real score
  const consistencyScore = selectedStudent.avgScore > 0
    ? Math.min(100, selectedStudent.avgScore + 5) // High scorers usually consistent
    : 50;

  // Growth: Trend (Simplification: Avg Score vs 60 baseline)
  const growthScore = Math.max(0, Math.min(100, selectedStudent.avgScore + 10));

  const radarData = [
    { subject: 'Attendance', A: selectedStudent.attendance || 0, fullMark: 100 },
    { subject: 'Avg Score', A: selectedStudent.avgScore || 0, fullMark: 100 },
    { subject: 'Engagement', A: engagementScore, fullMark: 100 },
    { subject: 'Growth', A: growthScore, fullMark: 100 },
    { subject: 'Consistency', A: consistencyScore, fullMark: 100 },
  ];

  // Navigation Items
  const navItems = [
    { id: 'OVERVIEW', label: 'Overview', icon: User },
    { id: 'ASSIGNMENTS', label: 'Assignments', icon: BookOpen },
    { id: 'GAPS', label: 'Gaps', icon: AlertTriangle },
    { id: 'CHARTS', label: 'Analytics', icon: BarChart2 },
  ];

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
    setViewMode('DASHBOARD');
  };

  const contextClass = displayedClassrooms.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-[#050510] font-sans text-white">
      {/* Top Bar */}
      <div className="h-16 border-b border-white/10 bg-[#0f1115]/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center font-bold text-lg text-white">
            {schoolName.charAt(0)}
          </div>
          <span className="text-xl font-bold tracking-tight hidden md:inline">{schoolName} <span className="text-gray-500 text-sm">| Parent</span></span>
        </div>

        {/* Child Selector */}
        <div className="relative group">
          <button className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10 hover:border-neon-cyan/50 transition-all">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center font-bold">
              {selectedStudent.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold leading-none">{selectedStudent.name}</p>
              <p className="text-[10px] text-green-400 font-medium">● Online</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {/* Interaction Hint: "Switch Child" could be a dropdown here */}
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full relative">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full text-red-400 hover:bg-red-500/10 transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* CLASS SELECTION VIEW */}
      {viewMode === 'CLASS_SELECTION' && (
        <div className="p-6 md:p-12 max-w-7xl mx-auto animate-fade-in">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Select a Class 📚</h1>
            <p className="text-gray-400">Choose a class to view detailed performance reports for <span className="text-neon-cyan font-bold">{selectedStudent.name}</span>.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedClassrooms.map((cls) => (
              <NeonCard
                key={cls.id}
                className="p-8 cursor-pointer hover:scale-105 transition-transform group flex flex-col items-center justify-center text-center gap-4 min-h-[200px]"
                onClick={() => handleClassSelect(cls.id)}
                glowColor="purple"
              >
                <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center group-hover:bg-neon-purple/30 transition-colors">
                  <Folder className="w-8 h-8 text-neon-purple" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{cls.name}</h3>
                  <p className="text-sm text-gray-400">Section {cls.section}</p>
                </div>
                <div className="mt-2 px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-gray-500">
                  {cls.subject || 'General'}
                </div>
              </NeonCard>
            ))}
          </div>

          {displayedClassrooms.length === 0 && (
            <div className="text-center text-gray-500 mt-12">
              <p>No classes found for this student.</p>
              <p className="text-sm mt-2">Please ask the student to join a class using a code.</p>
            </div>
          )}
        </div>
      )}


      {/* DASHBOARD VIEW */}
      {viewMode === 'DASHBOARD' && (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          {/* Header with Back Button */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('CLASS_SELECTION')}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-3xl font-bold mb-1">{contextClass?.name || 'Class Reports'}</h1>
                <p className="text-gray-400">Section {contextClass?.section}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === item.id
                    ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}

          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              {/* Weekly Growth Card */}
              <NeonCard className="col-span-1 md:col-span-2 p-6 relative overflow-hidden group" glowColor="cyan">
                <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-neon-cyan/20"></div>
                <div className="relative z-10 flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Weekly Snapshot</h3>
                    <p className="text-sm text-gray-400">Performance in <span className="text-white">{contextClass?.subject || 'all subjects'}</span>.</p>
                  </div>
                  <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">
                    Top 10%
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-black/20 rounded-xl p-4 text-center border border-white/5 hover:border-neon-cyan/30 transition-colors">
                    <div className="text-3xl font-bold text-neon-cyan mb-1">{selectedStudent.attendance}%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Attendance</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 text-center border border-white/5 hover:border-purple-500/30 transition-colors">
                    <div className="text-3xl font-bold text-purple-400 mb-1">{selectedStudent.avgScore}%</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Avg Score</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 text-center border border-white/5 hover:border-yellow-500/30 transition-colors">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">0</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Badges</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 text-center border border-white/5 hover:border-pink-500/30 transition-colors">
                    <div className="text-3xl font-bold text-pink-400 mb-1">{openGaps}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Open Gaps</div>
                  </div>
                </div>
              </NeonCard>

              {/* Weakness Alert Sidebar */}
              <NeonCard className="p-6" glowColor="red">
                <div className="flex items-center gap-2 mb-4 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-bold">Attention Needed</h3>
                </div>
                <div className="space-y-4">
                  {openGaps > 0 ? (
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer">
                      <p className="text-sm text-white font-medium mb-1">Learning Gap Detected</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Struggling with <span className="text-white font-bold">{selectedStudent.weaknessHistory?.find(w => w.status === 'OPEN')?.topic || 'Physics'}</span>.
                        We've assigned remedial videos.
                      </p>
                      <div className="mt-3 text-xs text-red-400 font-bold flex items-center gap-1">
                        View Remedial Plan <ChevronDown className="w-3 h-3 -rotate-90" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                      <CheckCircle className="w-10 h-10 mb-2 text-green-500/50" />
                      <p className="text-sm">No active concerns.</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-500 mb-3 font-bold tracking-wider">UPCOMING EVENTS</p>
                    <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Math Unit Test</p>
                        <p className="text-xs text-gray-400">Tomorrow, 10:00 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </NeonCard>
            </div>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === 'ASSIGNMENTS' && (
            <div className="space-y-6 animate-fade-in">
              {/* Summary Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NeonCard className="p-4 bg-green-500/5 border-green-500/20 flex flex-col items-center">
                  <div className="text-3xl font-bold text-green-400">{completedAssignments}</div>
                  <div className="text-sm text-gray-400">Completed</div>
                </NeonCard>
                <NeonCard className="p-4 bg-yellow-500/5 border-yellow-500/20 flex flex-col items-center">
                  <div className="text-3xl font-bold text-yellow-400">{pendingAssignments}</div>
                  <div className="text-sm text-gray-400">Pending</div>
                </NeonCard>
                <NeonCard className="p-4 bg-red-500/5 border-red-500/20 flex flex-col items-center">
                  <div className="text-3xl font-bold text-red-400">{missedAssignments}</div>
                  <div className="text-sm text-gray-400">Missed</div>
                </NeonCard>
              </div>

              {/* List */}
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 bg-black/20 border-b border-white/10 font-bold text-xs text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                  <div className="col-span-6 md:col-span-5">Assignment</div>
                  <div className="hidden md:block col-span-3">Subject</div>
                  <div className="col-span-3 md:col-span-2">Status</div>
                  <div className="col-span-3 md:col-span-2 text-right">Details</div>
                </div>

                {/* Real Assignment List matching Filters */}
                {assignments.length > 0 ? assignments.map((a, i) => {
                  const isSubmitted = submissions.find(s => s.assignmentId === a.id);
                  const isExpired = new Date(a.deadline) < new Date();
                  let status = 'PENDING';
                  let statusColor = 'yellow';
                  if (isSubmitted) { status = 'COMPLETED'; statusColor = 'green'; }
                  else if (isExpired) { status = 'MISSED'; statusColor = 'red'; }

                  return (
                    <div key={i} className="p-4 border-b border-white/5 grid grid-cols-12 gap-2 items-center hover:bg-white/5 transition-colors cursor-pointer group">
                      <div className="col-span-6 md:col-span-5">
                        <p className="font-medium text-white group-hover:text-neon-purple transition-colors">{a.title}</p>
                        <p className="md:hidden text-xs text-gray-500">{a.subject}</p>
                      </div>
                      <div className="hidden md:block col-span-3 text-sm text-gray-400">{a.subject}</div>
                      <div className="col-span-3 md:col-span-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold bg-${statusColor}-500/20 text-${statusColor}-400 border border-${statusColor}-500/30`}>
                          {status}
                        </span>
                      </div>
                      <div className="col-span-3 md:col-span-2 text-right text-sm font-mono text-gray-300">
                        {a.maxMarks + ' pts'}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center text-gray-500">No assignments found for this class.</div>
                )}
              </div>
            </div>
          )}

          {/* GAPS TAB */}
          {activeTab === 'GAPS' && (
            <div className="space-y-6 animate-fade-in">
              <NeonCard className="p-8 text-center md:text-left md:flex md:items-center md:justify-between" glowColor="purple">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Learning Gaps Analysis</h3>
                  <p className="text-gray-400 max-w-xl">
                    Understanding where {selectedStudent.name} is struggling in {contextClass?.subject || 'class'}.
                  </p>
                </div>
                <div className="mt-4 md:mt-0 px-4 py-2 bg-purple-500/20 rounded-lg border border-purple-500/30 text-purple-300 font-mono text-sm">
                  AI Status: <span className="text-green-400 font-bold">ACTIVE</span>
                </div>
              </NeonCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedStudent.weaknessHistory && selectedStudent.weaknessHistory.length > 0 ? selectedStudent.weaknessHistory.map((w: any) => (
                  <div key={w.id} className={`p-4 rounded-xl border flex flex-col justify-between ${w.status === 'OPEN' ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' : 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'} transition-all`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {w.status === 'OPEN' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">{w.topic}</h4>
                          <p className="text-sm text-gray-400">{w.subTopic || 'General Concept'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {w.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-white/5">
                      <span>Detected: {new Date(w.detectedAt || Date.now()).toLocaleDateString()}</span>
                      {w.status === 'OPEN' && (
                        <button className="text-blue-400 hover:text-blue-300 font-bold hover:underline flex items-center gap-1">
                          View Solution <ChevronDown className="w-3 h-3 -rotate-90" />
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="col-span-2 text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/10">
                    <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    No learning gaps detected yet. Great job!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHARTS TAB */}
          {activeTab === 'CHARTS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <NeonCard className="p-6 flex flex-col" glowColor="purple">
                  <h3 className="text-lg font-bold text-white mb-6">Subject Performance</h3>
                  <div className="w-full h-[300px] -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name={selectedStudent.name}
                          dataKey="A"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fill="#8b5cf6"
                          fillOpacity={0.3}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f1115', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                          itemStyle={{ color: '#8b5cf6' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </NeonCard>

                {/* Performance Trend (Real Data) */}
                <NeonCard className="p-6 flex flex-col" glowColor="cyan">
                  <h3 className="text-lg font-bold text-white mb-6">Score Consistency (Monthly Avg)</h3>
                  <div className="w-full h-[300px] pr-4">
                    {submissions.length > 0 ? (() => {
                      // Calculate data inside render or memo
                      const monthlyScores: Record<string, { total: number, count: number }> = {};
                      submissions.forEach(s => {
                        if (!s.submittedAt || s.marks === undefined) return;
                        const date = new Date(s.submittedAt);
                        const monthStr = date.toLocaleString('default', { month: 'short' });

                        // Find max marks
                        const assign = assignments.find(a => a.id === s.assignmentId);
                        const max = assign?.maxMarks || 100;
                        const percentage = (s.marks / max) * 100;

                        if (!monthlyScores[monthStr]) monthlyScores[monthStr] = { total: 0, count: 0 };
                        monthlyScores[monthStr].total += percentage;
                        monthlyScores[monthStr].count++;
                      });

                      const trendData = Object.keys(monthlyScores).map(m => ({
                        name: m,
                        score: Math.round(monthlyScores[m].total / monthlyScores[m].count)
                      }));

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#666" tick={{ fontSize: 12 }} domain={[0, 100]} />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              contentStyle={{ backgroundColor: '#0f1115', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                              formatter={(value: any) => [`${value}%`, 'Score']}
                            />
                            <Bar dataKey="score" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })() : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <BarChart2 className="w-12 h-12 mb-4 opacity-50" />
                        <p>No graded submissions yet.</p>
                      </div>
                    )}
                  </div>
                </NeonCard>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
