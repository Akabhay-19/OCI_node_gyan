
import React, { useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Key, Code, Terminal, Copy, Check, Lock, Globe, Server, Database, Users } from 'lucide-react';

interface DeveloperAPIProps {
    currentSchoolId: string;
}

export const DeveloperAPI: React.FC<DeveloperAPIProps> = ({ currentSchoolId }) => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'CURL' | 'JS' | 'PYTHON'>('CURL');

    const generateKey = async () => {
        setLoading(true);
        try {
            // Dynamic API URL resolution
            const API_URL = (import.meta as any).env.VITE_API_URL ||
                ((import.meta as any).env.PROD ? '/api' : 'http://localhost:5000/api');

            const res = await fetch(`${API_URL}/keys/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId: currentSchoolId })
            });
            if (!res.ok) {
                throw new Error(`Server Error: ${res.status} ${res.statusText}`);
            }
            const data = await res.json();
            setApiKey(data.key);
        } catch (error: any) {
            console.error("Failed to generate key", error);
            alert(`Failed to generate key: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyKey = () => {
        if (apiKey) {
            navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getCodeSnippet = () => {
        const dummyKey = apiKey || 'sk_live_xxxxxxxxxxxxxxxx';

        switch (activeTab) {
            case 'CURL':
                return `curl -X POST https://api.gyan.ai/external/chat \\
  -H "x-api-key: ${dummyKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Explain quantum physics",
    "context": "Grade 10 Physics"
  }'`;
            case 'JS':
                return `// 1. Get Student Dashboard
const studentId = 'STU-123';
const res = await fetch(\`https://api.gyan.ai/external/student/\${studentId}/dashboard\`, {
  headers: { 'x-api-key': '${dummyKey}' }
});
const dashboard = await res.json();
console.log("Pending Assignments:", dashboard.stats.assignmentsPending);

// 2. Submit Assignment
await fetch(\`https://api.gyan.ai/external/student/\${studentId}/submit-assignment\`, {
  method: 'POST',
  headers: { 
    'x-api-key': '${dummyKey}',
    'Content-Type': 'application/json' 
  },
  body: JSON.stringify({ assignmentId: 'ASG-99', content: 'My Answer...' })
});`;
            case 'PYTHON':
                return `import requests

# 1. Fetch Class Roster (Teacher View)
teacher_id = "TCH-555"
url = f"https://api.gyan.ai/external/teacher/{teacher_id}/classes"
headers = { "x-api-key": "${dummyKey}" }

response = requests.get(url, headers=headers)
print(f"Active Classes: {len(response.json()['classes'])}")

# 2. Get School Stats (Admin)
stats = requests.get("https://api.gyan.ai/external/admin/school-stats", headers=headers)
print(stats.json())`;
            default:
                return '';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Terminal className="w-6 h-6 text-green-400" /> Developer Console
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">Integrate Gyan AI directly into your school's LMS or mobile app.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* API Key Management */}
                <NeonCard glowColor="green" className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-yellow-400" /> API Credentials
                    </h3>

                    {!apiKey ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="w-8 h-8 text-gray-500" />
                            </div>
                            <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                                You don't have an active API key. Generate one to start making requests.
                            </p>
                            <NeonButton onClick={generateKey} variant="primary" glow disabled={loading}>
                                {loading ? 'Generating...' : 'Generate New API Key'}
                            </NeonButton>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-black/30 border border-green-500/30 rounded-xl p-4">
                                <div className="text-xs text-green-400 font-bold uppercase mb-1">Active Secret Key</div>
                                <div className="flex items-center justify-between gap-2">
                                    <code className="text-white font-mono text-sm break-all">{apiKey}</code>
                                    <button
                                        onClick={copyKey}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 p-3 rounded-lg border border-yellow-400/20">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                Please copy this key immediately. For security, we won't show it again completely.
                            </div>
                        </div>
                    )}
                </NeonCard>

                {/* Available Endpoints Info */}
                <NeonCard className="p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" /> Available Endpoints
                    </h3>
                    <div className="space-y-3">
                        <EndpointItem method="POST" path="/external/chat" desc="AI Tutor Chat bot integration" />
                        <EndpointItem method="POST" path="/external/quiz" desc="Generate quizzes programmatically" />
                        <EndpointItem method="POST" path="/external/students" desc="Sync student roster databases" />
                        <EndpointItem method="GET" path="/external/analytics" desc="Fetch school-wide performance data" />

                        <div className="pt-2 pb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Dashboard</div>
                        <EndpointItem method="GET" path="/external/student/:id/dashboard" desc="Get full dashboard stats" />
                        <EndpointItem method="POST" path="/external/student/:id/submit" desc="Submit assignment/quiz" />

                        <div className="pt-2 pb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Teacher Dashboard</div>
                        <EndpointItem method="GET" path="/external/teacher/:id/classes" desc="List all classes & rosters" />
                        <EndpointItem method="POST" path="/external/teacher/:id/assignment" desc="Create new assignment" />

                        <div className="pt-2 pb-1 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin Dashboard</div>
                        <EndpointItem method="POST" path="/external/admin/manage-users" desc="Add/Remove/Suspend users" />
                        <EndpointItem method="GET" path="/external/admin/audit-logs" desc="Security & Usage logs" />
                    </div>
                </NeonCard>
            </div>

            {/* Integration Guide */}
            <NeonCard className="p-0 overflow-hidden bg-[#1e1e1e] border-gray-700">
                <div className="bg-[#252526] p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <Code className="w-4 h-4 text-purple-400" /> Integration Examples
                    </h3>
                    <div className="flex bg-black/40 rounded-lg p-1">
                        {['CURL', 'JS', 'PYTHON'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-6 font-mono text-sm overflow-x-auto">
                    <pre className="text-blue-300">
                        {getCodeSnippet()}
                    </pre>
                </div>
            </NeonCard>
        </div>
    );
};

const EndpointItem: React.FC<{ method: string, path: string, desc: string }> = ({ method, path, desc }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
        <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-2 py-1 rounded ${method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                method === 'POST' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                {method}
            </span>
            <code className="text-sm text-gray-300">{path}</code>
        </div>
        <span className="text-xs text-gray-500 hidden sm:block">{desc}</span>
    </div>
);

// Import helper for the Alert Icon used above
function AlertCircle({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
