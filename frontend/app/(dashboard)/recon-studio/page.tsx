'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '../../_lib/api';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  status: 'unpaid' | 'paid';
  dueDate?: string;
}

interface Transaction {
  _id: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  paidAt: string;
  metadata?: {
    customerName?: string;
    customerEmail?: string;
  };
}

interface ReconciliationMatch {
  _id: string;
  invoiceId: Invoice;
  transactionId: Transaction;
  matchType: 'elastic' | 'gemini' | 'manual';
  confidence?: number;
  geminiReasoning?: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

interface ReconciliationReport {
  totalInvoices: number;
  totalMatched: number;
  totalUnmatched: number;
  totalOutstanding: number;
  matchedAmount: number;
  outstandingAmount: number;
  currency: string;
}

export default function ReconStudioPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [matches, setMatches] = useState<ReconciliationMatch[]>([]);
  const [report, setReport] = useState<ReconciliationReport | null>(null);

  // App UI State
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'unmatched'>('pending');
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const invoicesList = await api.get<Invoice[]>('/recon-studio/invoices');
      setInvoices(invoicesList);

      const matchesList = await api.get<ReconciliationMatch[]>('/recon-studio/matches');
      setMatches(matchesList);

      const reportData = await api.get<ReconciliationReport | null>('/recon-studio/reports');
      setReport(reportData);
    } catch (err) {
      console.error('Failed to load reconciliation data:', err);
    }
  }

  // 1. Upload Invoice CSV
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<{ inserted: number; skipped: number; errors: string[] }>(
        '/recon-studio/upload',
        formData
      );
      
      setUploadMsg({
        type: 'success',
        text: `Invoices uploaded: ${res.inserted} saved, ${res.skipped} skipped.`,
      });
      loadData();
    } catch (err) {
      setUploadMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed. Check CSV format.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // 2. Mock Ingest Payments (Fivetran simulation)
  async function handleSyncTransactions() {
    setSyncing(true);
    try {
      const res = await api.post<{ synced: number; skipped: number }>('/recon-studio/sync', {});
      setUploadMsg({
        type: 'success',
        text: `Fivetran Feed Ingestion complete: synced ${res.synced} transaction records.`,
      });
      loadData();
    } catch (err) {
      setUploadMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Sync failed.',
      });
    } finally {
      setSyncing(false);
    }
  }

  // 3. Trigger Match Job (Elastic + Gemini)
  async function handleRunReconciliation() {
    setMatching(true);
    try {
      const res = await api.post<{ matchesGenerated: number }>('/recon-studio/reconcile', {});
      setUploadMsg({
        type: 'success',
        text: `Reconciliation Engine completed: identified ${res.matchesGenerated} matching candidates.`,
      });
      loadData();
    } catch (err) {
      setUploadMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Matching failed.',
      });
    } finally {
      setMatching(false);
    }
  }

  // 4. Approve Suggested Match
  async function handleApprove(matchId: string) {
    setActionLoading(matchId);
    try {
      await api.post(`/recon-studio/matches/${matchId}/approve`, {});
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  // 5. Reject Suggested Match
  async function handleReject(matchId: string) {
    setActionLoading(matchId);
    try {
      await api.post(`/recon-studio/matches/${matchId}/reject`, {});
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  // Filtering Lists
  const pendingMatches = matches.filter((m) => m.status === 'pending_review');
  const approvedMatches = matches.filter((m) => m.status === 'approved');
  
  // Find invoices that have no match suggestions (and are unpaid)
  const matchedInvoiceIds = matches
    .filter((m) => m.status === 'approved' || m.status === 'pending_review')
    .map((m) => m.invoiceId?._id);
  const unmatchedInvoices = invoices.filter(
    (inv) => inv.status === 'unpaid' && !matchedInvoiceIds.includes(inv._id)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Recon Studio</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            Intelligent ledger balancing: resolve customer name discrepancies, transaction fees, and currencies.
          </p>
        </div>
      </div>

      {/* Top Operations Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Upload Invoices */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Step 1</span>
            <h3 className="text-sm font-bold text-white">Upload Ledger Invoices</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
              Upload your customer invoice records via CSV. Fields accepted: invoiceNumber, customerName, amount, currency, dueDate.
            </p>
          </div>
          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-750 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading CSV...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Select Invoice CSV File
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Sync Ingestion */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Step 2</span>
            <h3 className="text-sm font-bold text-white">Fetch Transaction Streams</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
              Trigger mock Fivetran sync feeds. Pulls payment gateway records from Stripe, Paystack, and bank statements into MongoDB.
            </p>
          </div>
          <div>
            <button
              onClick={handleSyncTransactions}
              disabled={syncing || invoices.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-750 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing Pipelines...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
                  </svg>
                  Sync Payment Sources
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 3: Run Engine */}
        <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block mb-1">Step 3</span>
            <h3 className="text-sm font-bold text-white">Execute Agent Recon</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">
              Triggers Elastic candidates query and Gemini fuzzy validations to resolve discrepancies and log findings.
            </p>
          </div>
          <div>
            <button
              onClick={handleRunReconciliation}
              disabled={matching || invoices.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {matching ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running AI Auditor...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 00-2 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Run Ledger Reconciliation
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upload/Notification Message */}
      {uploadMsg.text && (
        <div className={`rounded-xl border p-4 text-xs ${
          uploadMsg.type === 'success' 
            ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
            : 'bg-red-950/20 border-red-900/50 text-red-400'
        }`}>
          {uploadMsg.text}
        </div>
      )}

      {/* Main Grid: Match Review Area & Reports summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Match List Tab panels */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation tabs */}
          <div className="flex border-b border-gray-900 gap-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider relative cursor-pointer ${
                activeTab === 'pending' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Pending Review ({pendingMatches.length})
              {activeTab === 'pending' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />}
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider relative cursor-pointer ${
                activeTab === 'approved' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Reconciled ({approvedMatches.length})
              {activeTab === 'approved' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />}
            </button>
            <button
              onClick={() => setActiveTab('unmatched')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider relative cursor-pointer ${
                activeTab === 'unmatched' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Unmatched Invoices ({unmatchedInvoices.length})
              {activeTab === 'unmatched' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500" />}
            </button>
          </div>

          {/* Tab contents */}
          <div className="space-y-4">
            
            {/* Pending matches tab */}
            {activeTab === 'pending' && (
              pendingMatches.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl bg-gray-950/10 text-gray-500 text-xs">
                  No pending matches to review. Upload invoices, sync transaction feeds, and run the reconciliation auditor.
                </div>
              ) : (
                pendingMatches.map((match) => (
                  <div key={match._id} className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-5 space-y-4">
                    
                    {/* Header: Score / Confidence */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        {match.matchType === 'elastic' ? (
                          <span className="rounded-full bg-emerald-950 border border-emerald-900 px-2 py-0.5 text-emerald-400 font-semibold">
                            Elastic Auto-Match
                          </span>
                        ) : (
                          <span className="rounded-full bg-purple-950 border border-purple-900 px-2 py-0.5 text-purple-400 font-semibold">
                            Gemini Match Suggestion
                          </span>
                        )}
                        Confidence Score: {(match.confidence ?? 0 * 100).toFixed(0)}%
                      </span>

                      {/* Matching Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(match._id)}
                          disabled={actionLoading !== null}
                          className="rounded-lg border border-gray-800 hover:border-red-900/30 hover:bg-red-950/10 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleApprove(match._id)}
                          disabled={actionLoading !== null}
                          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                          Approve Match
                        </button>
                      </div>
                    </div>

                    {/* Compare Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-900 pt-4">
                      {/* Invoice details */}
                      <div className="space-y-1.5 text-xs">
                        <h4 className="font-bold text-white text-[10px] uppercase tracking-wider text-gray-500 mb-2">Ledger Invoice Details</h4>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Invoice Number:</span>
                          <span className="text-gray-200 font-mono font-medium">{match.invoiceId?.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer:</span>
                          <span className="text-gray-200 font-semibold">{match.invoiceId?.customerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Amount Due:</span>
                          <span className="text-gray-200 font-bold">
                            ${match.invoiceId?.amount?.toFixed(2)} {match.invoiceId?.currency}
                          </span>
                        </div>
                      </div>

                      {/* Transaction details */}
                      <div className="space-y-1.5 text-xs border-t md:border-t-0 md:border-l border-gray-900 pt-4 md:pt-0 md:pl-4">
                        <h4 className="font-bold text-white text-[10px] uppercase tracking-wider text-gray-500 mb-2">Synced Gateway Payment</h4>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Provider ID:</span>
                          <span className="text-gray-200 font-mono text-[11px] truncate max-w-[150px]" title={match.transactionId?.providerTransactionId}>
                            {match.transactionId?.providerTransactionId}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Customer (Gateway):</span>
                          <span className="text-gray-200 font-semibold">{match.transactionId?.metadata?.customerName ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Received Net:</span>
                          <span className="text-gray-200 font-bold text-emerald-400">
                            ${match.transactionId?.amount?.toFixed(2)} {match.transactionId?.currency}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Gemini Explanation details */}
                    {match.matchType === 'gemini' && match.geminiReasoning && (
                      <div className="rounded-lg bg-purple-950/10 border border-purple-900/30 p-3 text-xs text-purple-300 leading-relaxed font-sans">
                        <strong>Gemini Reasoning</strong>: {match.geminiReasoning}
                      </div>
                    )}

                  </div>
                ))
              )
            )}

            {/* Approved matches tab */}
            {activeTab === 'approved' && (
              approvedMatches.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl bg-gray-950/10 text-gray-500 text-xs">
                  No reconciled invoices. Approve suggested matches in the pending panel.
                </div>
              ) : (
                approvedMatches.map((match) => (
                  <div key={match._id} className="rounded-2xl border border-gray-900 bg-gray-950/20 p-5 space-y-3 opacity-80">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Reconciled
                      </span>
                      <span>Approved in Audit</span>
                    </div>

                    <div className="grid grid-cols-2 text-xs gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Invoice</p>
                        <p className="font-semibold text-white mt-1">{match.invoiceId?.customerName}</p>
                        <p className="text-gray-400 font-mono text-[10px]">{match.invoiceId?.invoiceNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Transaction amount</p>
                        <p className="font-bold text-emerald-400 mt-1">${match.transactionId?.amount?.toFixed(2)} {match.transactionId?.currency}</p>
                        <p className="text-gray-400 font-mono text-[10px]">{match.transactionId?.providerTransactionId}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {/* Unmatched invoices tab */}
            {activeTab === 'unmatched' && (
              unmatchedInvoices.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl bg-gray-950/10 text-gray-500 text-xs">
                  All uploaded invoices have matching transaction recommendations!
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#141d30] bg-[#090e1a] p-5">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-900 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="pb-3 pl-3">Invoice</th>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Due Date</th>
                        <th className="pb-3 pr-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900 text-gray-300">
                      {unmatchedInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-gray-800/10">
                          <td className="py-3 pl-3 font-mono text-white font-medium">{inv.invoiceNumber}</td>
                          <td className="py-3 font-semibold text-gray-300">{inv.customerName}</td>
                          <td className="py-3 text-gray-500">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 pr-3 text-right font-bold text-gray-300">
                            ${inv.amount.toFixed(2)} {inv.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

          </div>
        </div>

        {/* Right Side: Reports Summary Stats panel */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Ledger Balancing Summary</h3>
              <p className="text-xs text-gray-500 mt-1">Status reports compiled from latest audit actions</p>
            </div>

            {report ? (
              <div className="space-y-4">
                {/* Stat row 1 */}
                <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-900">
                  <span className="text-gray-400">Total Invoices</span>
                  <span className="font-bold text-white">{report.totalInvoices}</span>
                </div>

                {/* Stat row 2 */}
                <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-900">
                  <span className="text-gray-400">Reconciled Count</span>
                  <span className="font-bold text-emerald-400">{report.totalMatched}</span>
                </div>

                {/* Stat row 3 */}
                <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-900">
                  <span className="text-gray-400">Unreconciled Invoices</span>
                  <span className="font-bold text-yellow-500">{report.totalUnmatched}</span>
                </div>

                {/* Stat row 4 */}
                <div className="flex justify-between items-center text-xs pb-3 border-b border-gray-900">
                  <span className="text-gray-400">Balanced Volume</span>
                  <span className="font-bold text-emerald-400">
                    ${(report.matchedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {report.currency ?? 'USD'}
                  </span>
                </div>

                {/* Stat row 5 */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Outstanding Balance</span>
                  <span className="font-bold text-yellow-500">
                    ${(report.outstandingAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {report.currency ?? 'USD'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500 border border-dashed border-gray-800 rounded-xl bg-gray-950/20">
                No ledger balancing data. Simulate reconciliation to compile metrics.
              </div>
            )}
            
            <button
              onClick={loadData}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-gray-800 hover:border-gray-700 bg-transparent py-2 text-xs font-semibold text-gray-300 transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18" />
              </svg>
              Refresh Ledger Status
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
