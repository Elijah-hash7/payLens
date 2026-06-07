export default function DevStudioPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Dev Studio</h1>
      <p className="mt-1 text-sm text-gray-400">
        Simulate payments, test webhooks, and get AI-powered explanations
      </p>

      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-500">
          Connect your Stripe or Paystack test API key to get started.
        </p>
        <div className="mt-4 h-8 w-32 rounded-md bg-gray-800 animate-pulse" />
      </div>
    </div>
  );
}
