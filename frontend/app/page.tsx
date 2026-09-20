'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AnalysisResult {
  query: string;
  intent: string;
  sentiment: string;
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  response: string;
}

const priorityColors = {
  High: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  Medium: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  Low: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
};

const actionLabels: Record<string, string> = {
  escalate_human: 'Escalated to Specialist',
  priority_response: 'Priority Response',
  standard_response: 'Standard Response',
};

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(true);
  const [userName, setUserName] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const name = localStorage.getItem('user_name');
    if (!token) {
      router.push('/login');
    } else {
      setUserName(name || '');
      setCheckingAuth(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_name');
    router.push('/login');
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) {
        throw new Error('Request Failed');
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch {
      setError(
        'Unable to connect with backend service. Verify that FastAPI is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B1120] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-4 top-20 h-40 w-40 sm:left-20 sm:h-72 sm:w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-4 bottom-20 h-40 w-40 sm:right-20 sm:h-72 sm:w-72 rounded-full bg-blue-500/10 blur-3xl" />
      </div>

    

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 sm:px-4 py-1.5 sm:py-2 text-cyan-300 text-xs sm:text-sm">
              AI Powered Customer Support
            </div>

            <h1 className="mt-4 sm:mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Complaint Analysis
              <span className="block text-cyan-400">
                Meridian Financial
              </span>
            </h1>

            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-400 max-w-2xl">
              Automatically classify complaints, detect sentiment,
              prioritize cases and generate policy-based responses.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap">
              Hi, {userName}
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300 transition whitespace-nowrap"
            >
              {showDetails ? 'Customer View' : 'Agent View'}
            </button>

              <Link
  href="/history"
  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300 transition whitespace-nowrap"
>
  History
</Link>
            <button
              onClick={handleLogout}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm text-slate-300 hover:border-red-500/30 hover:text-red-300 transition whitespace-nowrap"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">

          {/* Left Side */}

          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-8">

            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
              Customer Complaint
            </h2>

            <textarea
              rows={8}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe customer complaint here..."
              className="w-full rounded-xl sm:rounded-2xl bg-[#111827] border border-white/10 p-3 sm:p-4 text-sm sm:text-base text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
            />

            <button
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              className="mt-4 sm:mt-5 w-full rounded-xl sm:rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 sm:py-4 text-sm sm:text-base font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Analyzing Complaint...' : 'Analyze Complaint'}
            </button>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 sm:p-4 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* Right Side */}

          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-8">

            {!loading && !result && (
              <div className="h-full flex items-center justify-center text-center py-10 lg:py-0">
                <div>
                  <div className="text-5xl sm:text-6xl mb-4">🤖</div>
                  <h3 className="text-lg sm:text-xl font-semibold">
                    Awaiting Analysis
                  </h3>
                  <p className="text-sm sm:text-base text-slate-400 mt-2">
                    Submit a complaint to generate an AI report.
                  </p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center py-10 lg:py-0">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                  <p className="mt-4 text-sm sm:text-base text-slate-400">
                    AI is reviewing the complaint...
                  </p>
                </div>
              </div>
            )}

            {/* ===== CUSTOMER VIEW (simple) ===== */}
            {result && !showDetails && (
              <div className="h-full flex flex-col">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Response</h2>
                <div className="rounded-xl sm:rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-6">
                  <p className="leading-7 sm:leading-8 text-sm sm:text-base text-slate-300">
                    {result.response}
                  </p>
                </div>
              </div>
            )}

            {/* ===== AGENT VIEW (detailed) ===== */}
            {result && showDetails && (
              <>
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
                  Analysis Report
                </h2>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">

                  <div className="rounded-xl sm:rounded-2xl bg-[#111827] p-3 sm:p-5 border border-white/10">
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Category
                    </p>
                    <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold capitalize">
                      {result.intent.replaceAll('_', ' ')}
                    </p>
                  </div>

                  <div className="rounded-xl sm:rounded-2xl bg-[#111827] p-3 sm:p-5 border border-white/10">
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Sentiment
                    </p>
                    <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold">
                      {result.sentiment}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl sm:rounded-2xl p-3 sm:p-5 border ${
                      priorityColors[result.priority].border
                    } ${
                      priorityColors[result.priority].bg
                    }`}
                  >
                    <p className="text-slate-400 text-xs sm:text-sm">
                      Priority
                    </p>

                    <p
                      className={`mt-1 sm:mt-2 text-sm sm:text-base font-semibold ${
                        priorityColors[result.priority].text
                      }`}
                    >
                      {result.priority}
                    </p>
                  </div>

                  <div className="rounded-xl sm:rounded-2xl bg-[#111827] p-3 sm:p-5 border border-white/10">
                    <p className="text-slate-500 text-xs sm:text-sm">
                      Action
                    </p>

                    <p className="mt-1 sm:mt-2 text-sm sm:text-base font-semibold">
                      {actionLabels[result.action] ??
                        result.action}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl sm:rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-6">
                  <h3 className="text-cyan-400 text-sm sm:text-base font-semibold mb-2 sm:mb-3">
                    AI Generated Response
                  </h3>

                  <p className="leading-7 sm:leading-8 text-sm sm:text-base text-slate-300">
                    {result.response}
                  </p>
                </div>

                <div className="mt-4 sm:mt-5 rounded-xl sm:rounded-2xl bg-[#111827] border border-white/10 p-4 sm:p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                    Original Complaint
                  </p>

                  <p className="text-sm sm:text-base text-slate-300">
                    {result.query}
                  </p>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}