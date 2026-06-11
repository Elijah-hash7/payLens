# PayLens

PayLens is a web application with two distinct tools designed to solve common payment integration and bookkeeping challenges.

## The Two Tools

### Dev Studio (Payment Sandbox Agent)
Sandboxes from payment providers like Stripe or Paystack often return generic error codes without explanation, require looking up fake card tokens, and suffer from unreliable webhook testing.

Dev Studio connects to your Stripe test account and lets you type what you want to test in plain English. For example, "Simulate a payment failure due to insufficient funds and alert my webhook".

PayLens selects the correct card token, simulates the transaction against the API, fires the payload to your webhook endpoint, measures delivery latency, and uses Gemini to explain the entire outcome and any webhook errors in plain language.

### Recon Studio (Payment Reconciliation Agent)
Reconciling invoices at the end of the month from multiple payment sources is usually done manually line by line in Excel. This is slow and prone to errors caused by name variations, transaction fees, and currency differences.

Recon Studio automatically ingests your transaction streams. You upload your invoice CSV, and Elastic executes matching algorithms to resolve name mismatches, fee deductions, and date ranges. For records with low confidence, Gemini reviews the data, outlines its reasoning, and flags candidates for approval. Reconciliations are finished in minutes instead of hours.

## Tech Stack

Frontend: Next.js (App Router), Tailwind CSS v4, Vanilla CSS
Backend: NestJS, TypeScript
Database: MongoDB (Mongoose models for users, invoices, transactions, and matches)
Search & Logs: Elasticsearch (indexes Dev Studio test runs and Recon fuzzy matches)
AI: Gemini (using `@google/genai` SDK)
Monitoring: Arize (agent accuracy and evaluation tracking)

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running instance
- Elasticsearch running instance

### Environment Variables

Create a .env file in the backend directory (using port 3002 to avoid conflicts with 3000/3001):
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/paylens
JWT_SECRET=your_jwt_secret_token_here

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

ELASTIC_URL=http://localhost:9200
ELASTIC_API_KEY=your_elastic_api_key_optional
```

Create a .env.local file in the frontend directory (pointing to the backend on 3002):
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Installation

Install dependencies in both directories:

In backend:
```bash
npm install
```

In frontend:
```bash
npm install
```

### Running the App

Start Backend Server:
```bash
cd backend
npm run start:dev
```
The backend server will run on http://localhost:3002.

Start Frontend Dev Server on port 3001 (since port 3000 is occupied):
```bash
cd frontend
npm run dev -- -p 3001
```

Open http://localhost:3001 in your web browser.

## Authentication and Guest Access

You can use the app in two ways:
1. Standard Sign In and Registration: Create a secure account on the Register page. Accounts are hashed with bcryptjs and secured with JWT tokens.
2. Guest Session: Click "Continue as Guest" on the Login screen to bypass registration. The frontend uses a local guest session, and the backend handles all simulations, logging, and matches using a fallback anonymous user scope.
