'use client';

import { useEffect, useState } from 'react';
import { api } from '../../_lib/api';

interface Stats {
  devStudioRuns: number;
  invoicesUploaded: number;
  invoicesReconciled: number;
  totalVolume: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    devStudioRuns: 0,
    invoicesUploaded: 0,
    invoicesReconciled: 0,
    totalVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        // Fetch runs history to count
        const runs = await api.get<any[]>('/dev-studio/history').catch(() => []);
        
        // Fetch invoices count
        const invoices = await api.get<any[]>('/recon-studio/invoices').catch(() => []);
        
        setStats({
          devStudioRuns: runs.length,
          invoicesUploaded: invoices.length,
          invoicesReconciled: invoices.filter((i: any) => i.status === 'paid').length,
          totalVolume: invoices.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0),
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Greeting Banner */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Executive Overview</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Real-time operations center tracking payment simulation logs and reconciliation agent metrics.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 shadow-lg flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dev Studio Runs</p>
            <h3 className="mt-1 text-2xl font-bold text-white leading-tight">
              {loading ? '...' : stats.devStudioRuns}
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">Elastic log search active</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 shadow-lg flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Invoices Ingested</p>
            <h3 className="mt-1 text-2xl font-bold text-white leading-tight">
              {loading ? '...' : stats.invoicesUploaded}
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">CSV document store</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 shadow-lg flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reconciled Count</p>
            <h3 className="mt-1 text-2xl font-bold text-white leading-tight">
              {loading ? '...' : stats.invoicesReconciled}
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">AI & Fuzzy matching match rate</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 shadow-lg flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Volume</p>
            <h3 className="mt-1 text-2xl font-bold text-white leading-tight">
              {loading ? '...' : `$${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">USD base calculation</span>
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Platform Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Launchpad Cards */}
        <div className="lg:col-span-7 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.9 1.519-.9 1.818 0l1.518 4.674a1 1 0 00.95.69h4.907c.961 0 1.362 1.248.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.9-.755 1.688-1.538 1.11l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.21-1.538-1.11l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.572-.383-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.518-4.674z" />
            </svg>
            Agent Launchpad
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Dev Studio Launch */}
            <a
              href="/dev-studio"
              className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 flex flex-col justify-between h-44 group bg-gradient-to-br from-blue-950/10 to-transparent"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 transition-colors group-hover:bg-blue-600/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">Dev Studio →</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Connect test keys, prompt sandbox integrations, and trigger webhook payloads with Gemini reviews.
                </p>
              </div>
            </a>

            {/* Recon Studio Launch */}
            <a
              href="/recon-studio"
              className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 flex flex-col justify-between h-44 group bg-gradient-to-br from-purple-950/10 to-transparent"
            >
              <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 transition-colors group-hover:bg-purple-600/20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition-colors">Recon Studio →</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Upload CSV invoice structures, link transaction pipelines, and resolve mismatched audits with Elastic.
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* Platform Status */}
        <div className="lg:col-span-5 space-y-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            System Operations
          </h2>

          <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 space-y-4">
            {/* Status Item 1 */}
            <div className="flex items-center justify-between text-xs border-b border-gray-900 pb-3">
              <span className="font-semibold text-gray-300">Stripe Integration Sandbox</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>

            {/* Status Item 2 */}
            <div className="flex items-center justify-between text-xs border-b border-gray-900 pb-3">
              <span className="font-semibold text-gray-300">Gemini Pro Agent Brain</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>

            {/* Status Item 3 */}
            <div className="flex items-center justify-between text-xs border-b border-gray-900 pb-3">
              <span className="font-semibold text-gray-300">Elasticsearch Log Engine</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </div>

            {/* Status Item 4 */}
            <div className="flex items-center justify-between text-xs border-b border-gray-900 pb-3">
              <span className="font-semibold text-gray-300">MongoDB Clusters</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Stable
              </span>
            </div>

            {/* Status Item 5 */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300">Arize Guardrail Monitors</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Tracking
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Activity Timeline */}
      <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Platform Activities
        </h2>

        <div className="relative border-l border-gray-800 ml-3 pl-6 space-y-6">
          <div className="relative">
            <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full border border-blue-500 bg-[#030303]" />
            <p className="text-xs font-semibold text-white">Stripe Sandbox charge completed</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Payment token mapping successfully ran Visa Charge Simulation (`tok_visa`)</p>
          </div>
          <div className="relative">
            <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full border border-purple-500 bg-[#030303]" />
            <p className="text-xs font-semibold text-white">Gemini response explanation generated</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Synthesized Stripe and Webhook API payload responses in plain English</p>
          </div>
          <div className="relative">
            <span className="absolute -left-[30px] top-1 h-3.5 w-3.5 rounded-full border border-indigo-500 bg-[#030303]" />
            <p className="text-xs font-semibold text-white">Elastic log entry indexed</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Simulation results added to the `paylens-test-runs` search index</p>
          </div>
        </div>
      </div>

    </div>
  );
}
