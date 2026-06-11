'use client';

import { useState, useEffect } from 'react';
import { api } from '../../_lib/api';

interface TestCard {
  token: string;
  scenario: string;
  expectedOutcome: string;
}

interface PaymentSimulationResult {
  selectedCard: TestCard;
  chargeId: string;
  status: string;
  amount: number;
  currency: string;
  outcome: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
  raw: Record<string, unknown> | null;
}

interface WebhookResult {
  fired: boolean;
  statusCode: number | null;
  body: any;
  durationMs: number;
  error: string | null;
}

interface TestRunResult {
  payment: PaymentSimulationResult;
  webhook: WebhookResult;
  explanation: string;
}

interface TestRunLog {
  scenario: string;
  provider: string;
  selectedCard: string;
  paymentStatus: string;
  chargeId: string;
  webhookFired: boolean;
  webhookStatusCode: number | null;
  webhookDurationMs: number;
  webhookError: string | null;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

const QUICK_SCENARIOS = [
  { label: 'Success Visa', text: 'Simulate a successful visa payment' },
  { label: 'Insufficient Funds', text: 'Simulate a payment failure due to insufficient funds' },
  { label: 'Expired Card', text: 'Simulate a payment that fails because the card is expired' },
  { label: 'Incorrect CVC', text: 'Simulate a payment with an incorrect CVC/CVV security code' },
  { label: 'Processing Error', text: 'Simulate a payment failure due to an unexpected system processing error' },
];

export default function DevStudioPage() {
  const [testApiKey, setTestApiKey] = useState('');
  const [scenario, setScenario] = useState('');
  const [webhookEndpointUrl, setWebhookEndpointUrl] = useState('');
  const [amount, setAmount] = useState(1000); // in cents ($10.00)
  const [currency, setCurrency] = useState('usd');
  
  // App UI State
  const [step, setStep] = useState<'idle' | 'simulating' | 'dispatching' | 'explaining' | 'done'>('idle');
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [error, setError] = useState('');

  // History State
  const [history, setHistory] = useState<TestRunLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<TestRunLog | null>(null);

  // Load saved keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTestApiKey(localStorage.getItem('paylens_stripe_key') || '');
      setWebhookEndpointUrl(localStorage.getItem('paylens_webhook_url') || '');
    }
    fetchHistory();
  }, []);

  async function fetchHistory(query = '') {
    setHistoryLoading(true);
    try {
      const logs = await api.get<TestRunLog[]>(`/dev-studio/history${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setHistory(logs);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchHistory(searchQuery);
  }

  async function handleRunTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testApiKey) {
      setError('Stripe Test API key is required');
      return;
    }
    if (!scenario) {
      setError('Please provide or select a test scenario');
      return;
    }
    if (!webhookEndpointUrl) {
      setError('Webhook endpoint URL is required');
      return;
    }

    // Persist values in localStorage
    localStorage.setItem('paylens_stripe_key', testApiKey);
    localStorage.setItem('paylens_webhook_url', webhookEndpointUrl);

    setError('');
    setResult(null);
    setSelectedHistoryItem(null);
    
    // Begin Multi-step Visualizer Stepper
    setStep('simulating');
    
    try {
      // Step 1: Simulate Payment
      const response = await api.post<TestRunResult>('/dev-studio/run', {
        testApiKey,
        scenario,
        webhookEndpointUrl,
        amount: Number(amount),
        currency,
      });

      setStep('dispatching');
      // Wait a moment for simulated visual feedback
      await new Promise(r => setTimeout(r, 800));

      setStep('explaining');
      await new Promise(r => setTimeout(r, 600));

      setResult(response);
      setStep('done');
      fetchHistory(); // Refresh searchable history logs
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
      setStep('idle');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dev Studio</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Orchestrate payment sandboxes, trigger real webhook payloads, and get intelligent Gemini explanations.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Form Config */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Sandbox Configuration
            </h2>

            <form onSubmit={handleRunTest} className="space-y-4">
              {/* Stripe Key */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Stripe Test API Secret Key
                </label>
                <input
                  type="password"
                  required
                  value={testApiKey}
                  onChange={(e) => setTestApiKey(e.target.value)}
                  placeholder="sk_test_..."
                  className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Webhook Endpoint */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Target Webhook Endpoint URL
                </label>
                <input
                  type="url"
                  required
                  value={webhookEndpointUrl}
                  onChange={(e) => setWebhookEndpointUrl(e.target.value)}
                  placeholder="https://api.yourdomain.com/webhooks/stripe"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Scenario Prompt */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Test Scenario (Plain English)
                </label>
                <textarea
                  required
                  rows={3}
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. Simulate a payment that fails due to insufficient funds and alert my webhook"
                  className="w-full rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Suggestion Chips */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-gray-500">Quick Scenarios:</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SCENARIOS.map((qs) => (
                    <button
                      key={qs.label}
                      type="button"
                      onClick={() => setScenario(qs.text)}
                      className="rounded-full border border-gray-800 bg-gray-900/60 hover:bg-gray-800 hover:border-gray-700 px-2.5 py-1 text-[11px] font-medium text-gray-300 transition-all cursor-pointer"
                    >
                      {qs.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="pt-2 border-t border-gray-800 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Amount (in Cents)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="gbp">GBP (£)</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={step !== 'idle' && step !== 'done'}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {step !== 'idle' && step !== 'done' ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running Orchestrator...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Simulate & Fire Webhook
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Stepper & Output Details */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 shadow-xl h-full flex flex-col">
            
            {/* Live Progress Stepper */}
            {step !== 'idle' && (
              <div className="mb-6 grid grid-cols-3 gap-2">
                {/* Step 1 */}
                <div className="flex flex-col gap-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === 'simulating' ? 'bg-blue-500 animate-pulse' : (step === 'dispatching' || step === 'explaining' || step === 'done' ? 'bg-emerald-500' : 'bg-gray-800')
                  }`} />
                  <span className="text-[10px] font-semibold text-gray-400">1. Stripe Simulation</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col gap-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === 'dispatching' ? 'bg-blue-500 animate-pulse' : (step === 'explaining' || step === 'done' ? 'bg-emerald-500' : 'bg-gray-800')
                  }`} />
                  <span className="text-[10px] font-semibold text-gray-400">2. Dispatch Webhook</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col gap-1">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    step === 'explaining' ? 'bg-blue-500 animate-pulse' : (step === 'done' ? 'bg-emerald-500' : 'bg-gray-800')
                  }`} />
                  <span className="text-[10px] font-semibold text-gray-400">3. Gemini Analysis</span>
                </div>
              </div>
            )}

            {/* Stepper Status Screen */}
            {(step === 'simulating' || step === 'dispatching' || step === 'explaining') && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-gray-800 border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-400 font-semibold uppercase tracking-wider">
                    {step === 'simulating' ? 'API' : step === 'dispatching' ? 'HTTP' : 'AI'}
                  </div>
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {step === 'simulating' && 'Firing charge event against Stripe sandbox...'}
                  {step === 'dispatching' && 'Delivering event payload to webhook endpoint...'}
                  {step === 'explaining' && 'Invoking Gemini for plain English explanation...'}
                </h3>
                <p className="mt-1.5 text-xs text-gray-500 max-w-xs">
                  {step === 'simulating' && 'Mapping scenario to test card tok_ visa...'}
                  {step === 'dispatching' && 'Capturing real-time endpoint latency...'}
                  {step === 'explaining' && 'Synthesizing response payloads...'}
                </p>
              </div>
            )}

            {/* Idle state */}
            {step === 'idle' && !result && !selectedHistoryItem && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 border border-dashed border-gray-800 rounded-xl bg-gray-950/20">
                <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-3 text-sm font-semibold text-gray-400">Awaiting Simulation Request</h3>
                <p className="mt-1 text-xs text-gray-500 max-w-xs">
                  Configure details on the left panel or click any log entry below to view simulation details.
                </p>
              </div>
            )}

            {/* Results Panel (for new run or loaded history item) */}
            {(result || selectedHistoryItem) && (
              <div className="flex-1 flex flex-col justify-between space-y-6">
                
                {/* Gemini Explainer Header */}
                <div className="rounded-xl border border-blue-900/30 bg-blue-950/10 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Gemini Agent Summary
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {selectedHistoryItem ? new Date(selectedHistoryItem.createdAt).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-100 leading-relaxed font-sans">
                    {result ? result.explanation : 'Reconstructed simulation summary based on indexed Elastic records:'}
                  </p>
                  {!result && selectedHistoryItem && (
                    <div className="text-xs text-gray-300 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                      <strong>Scenario Attempted</strong>: "{selectedHistoryItem.scenario}"<br />
                      <strong>Result</strong>: {selectedHistoryItem.paymentStatus === 'succeeded' ? 'Payment Succeeded.' : `Payment Failed (${selectedHistoryItem.errorCode ?? 'Declined'}).`} {selectedHistoryItem.errorMessage}
                    </div>
                  )}
                </div>

                {/* Sub-results Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Payment simulation results */}
                  <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Payment Sandbox</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          (result?.payment.status ?? selectedHistoryItem?.paymentStatus) === 'succeeded' 
                            ? 'bg-emerald-950/50 border border-emerald-900 text-emerald-400' 
                            : 'bg-red-950/50 border border-red-900 text-red-400'
                        }`}>
                          {result?.payment.status ?? selectedHistoryItem?.paymentStatus}
                        </span>
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Charge ID:</span>
                          <span className="font-mono text-gray-200 text-[11px] truncate max-w-[120px]">
                            {result?.payment.chargeId ?? selectedHistoryItem?.chargeId ?? 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-semibold text-gray-200">
                            {result 
                              ? `$${(result.payment.amount / 100).toFixed(2)} ${result.payment.currency.toUpperCase()}`
                              : `Synced Record`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Card Used:</span>
                          <span className="font-mono text-blue-400">
                            {result?.payment.selectedCard.token ?? selectedHistoryItem?.selectedCard ?? 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(result?.payment.errorCode || selectedHistoryItem?.errorCode) && (
                      <div className="mt-2 rounded-lg bg-red-950/20 p-2 text-[11px] text-red-400 border border-red-950">
                        <strong>{result?.payment.errorCode ?? selectedHistoryItem?.errorCode}</strong>: {result?.payment.errorMessage ?? selectedHistoryItem?.errorMessage}
                      </div>
                    )}
                  </div>

                  {/* Webhook delivery results */}
                  <div className="rounded-xl border border-gray-800 bg-gray-950/30 p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Webhook Dispatcher</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                          (result?.webhook.fired ?? selectedHistoryItem?.webhookFired)
                            ? 'bg-emerald-950/50 border border-emerald-900 text-emerald-400' 
                            : 'bg-red-950/50 border border-red-900 text-red-400'
                        }`}>
                          {(result?.webhook.fired ?? selectedHistoryItem?.webhookFired) ? 'Delivered' : 'Failed'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>HTTP Status:</span>
                          <span className={`font-semibold ${
                            (result?.webhook.statusCode ?? selectedHistoryItem?.webhookStatusCode) === 200 
                              ? 'text-emerald-400' 
                              : 'text-yellow-400'
                          }`}>
                            {result?.webhook.statusCode ?? selectedHistoryItem?.webhookStatusCode ?? 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Latency:</span>
                          <span className="text-gray-200">
                            {result?.webhook.durationMs ?? selectedHistoryItem?.webhookDurationMs ?? 0}ms
                          </span>
                        </div>
                        {result?.webhook.error && (
                          <div className="text-[10px] text-red-400 break-all leading-snug">
                            {result.webhook.error}
                          </div>
                        )}
                        {selectedHistoryItem?.webhookError && (
                          <div className="text-[10px] text-red-400 break-all leading-snug">
                            {selectedHistoryItem.webhookError}
                          </div>
                        )}
                      </div>
                    </div>

                    {result?.webhook.body && (
                      <div className="mt-2 text-[10px] bg-gray-950 border border-gray-800 p-2 rounded-lg max-h-[80px] overflow-auto">
                        <span className="text-gray-500 font-semibold block uppercase text-[9px] mb-1">Receiver Response:</span>
                        <pre className="text-gray-300 font-mono">
                          {typeof result.webhook.body === 'object' 
                            ? JSON.stringify(result.webhook.body) 
                            : result.webhook.body
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reset Panel */}
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={() => {
                      setResult(null);
                      setSelectedHistoryItem(null);
                      setStep('idle');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Output View
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* History Database Log Section */}
      <div className="rounded-2xl border border-[#141d30] bg-[#090e1a] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Orchestrator Search & History
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Logs indexed real-time in Elasticsearch</p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scenario, status, error messages..."
              className="w-full md:w-64 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              className="rounded-lg bg-gray-800 hover:bg-gray-750 px-3 py-1.5 text-xs text-white transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* History table */}
        {historyLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl bg-gray-950/10 text-gray-500 text-xs">
            No logs found. Simulate a scenario to create your first log.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pl-3">Scenario</th>
                  <th className="pb-3">Card</th>
                  <th className="pb-3">Stripe Status</th>
                  <th className="pb-3">Webhook</th>
                  <th className="pb-3">Time</th>
                  <th className="pb-3 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50 text-xs text-gray-300">
                {history.map((log, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedHistoryItem(log)}
                    className="hover:bg-gray-800/20 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 pl-3 pr-4 font-medium text-white max-w-[200px] md:max-w-[300px] truncate">
                      {log.scenario}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-blue-400">
                      {log.selectedCard}
                    </td>
                    <td className="py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        log.paymentStatus === 'succeeded' 
                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-950' 
                          : 'bg-red-950/30 text-red-400 border border-red-950'
                      }`}>
                        {log.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      {log.webhookFired ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          log.webhookStatusCode === 200
                            ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-950'
                            : 'bg-yellow-950/30 text-yellow-400 border border-yellow-950'
                        }`}>
                          {log.webhookStatusCode ?? 'Unknown'}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-950/30 text-red-400 border border-red-950">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHistoryItem(log);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
