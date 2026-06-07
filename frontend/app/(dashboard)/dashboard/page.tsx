export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Overview</h1>
      <p className="mt-1 text-sm text-gray-400">Welcome to PayLens</p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm font-medium text-gray-400">Dev Studio</p>
          <p className="mt-2 text-3xl font-semibold text-white">0</p>
          <p className="mt-1 text-sm text-gray-500">Test runs this week</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm font-medium text-gray-400">Recon Studio</p>
          <p className="mt-2 text-3xl font-semibold text-white">0</p>
          <p className="mt-1 text-sm text-gray-500">Invoices reconciled</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <a
          href="/dev-studio"
          className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-blue-600 transition-colors group"
        >
          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
            Dev Studio →
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Simulate payments, test webhooks, get Gemini explanations
          </p>
        </a>
        <a
          href="/recon-studio"
          className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-blue-600 transition-colors group"
        >
          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
            Recon Studio →
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Match payments to invoices automatically
          </p>
        </a>
      </div>
    </div>
  );
}
