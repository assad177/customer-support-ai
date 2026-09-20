'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Complaint {
  id: number;
  query: string;
  intent: string;
  sentiment: string;
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  response: string;
  created_at: string;
}

const priorityColors = {
  High: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  Medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  Low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

export default function History() {
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/history', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        setComplaints(data.complaints);
      } catch {
        setError('Could not load history. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#0B1120] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Case History</h1>
            <p className="text-sm text-slate-400 mt-1">Your previously submitted complaints</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:border-cyan-500/30 hover:text-cyan-300 transition"
          >
            New complaint
          </Link>
        </div>

        {loading && <p className="text-slate-400 text-sm">Loading history...</p>}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && complaints.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-slate-400">No complaints submitted yet.</p>
          </div>
        )}

        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-sm text-slate-300 flex-1">{c.query}</p>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border ${priorityColors[c.priority].border} ${priorityColors[c.priority].bg} ${priorityColors[c.priority].text}`}
                >
                  {c.priority}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mb-3">
                <span>Category: <span className="text-slate-300 capitalize">{c.intent.replaceAll('_', ' ')}</span></span>
                <span>Sentiment: <span className="text-slate-300">{c.sentiment}</span></span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>

              <div className="rounded-xl bg-[#111827] border border-white/10 p-4">
                <p className="text-sm text-slate-300 leading-relaxed">{c.response}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}