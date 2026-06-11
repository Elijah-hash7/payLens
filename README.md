# PayLens — Intelligent Payment Sandbox & Reconciliation Platform

**PayLens** is a modern financial technology platform equipped with two AI-driven agents that streamline payment workflows. Built for the Google Cloud Rapid Agent Hackathon (Financial Services Track).

---

## 🌟 The Two Agents

### 1. Dev Studio (Payment Sandbox Agent)
Sandboxes from payment providers (like Stripe or Paystack) often return generic error codes (e.g. `card_declined`) without detail, require looking up fake card tokens, and suffer from unreliable webhook testing. 
* **What it does**: Connects to your Stripe test account. Describe what you want to test in plain English (e.g., *"Simulate a payment failure due to insufficient funds and alert my webhook"*). 
* **The Flow**: PayLens selects the correct card token, simulates the transaction against the API, fires the payload to your webhook endpoint, measures delivery latency, and uses **Gemini 2.0** to explain the entire outcome (and any webhook bugs) in plain English.

### 2. Recon Studio (Payment Reconciliation Agent)
Reconciling invoices at the end of the month from multiple payment sources (Stripe, bank feeds, cash) is usually done manually line-by-line using Excel. It is slow and prone to errors caused by name variations, transaction fees, and currency differences.
* **What it does**: Ingests your transaction streams automatically. Business owners upload their invoice CSV.
* **The Flow**: **Elastic** executes intelligent matching algorithms (resolving name mismatches, fee deductions, and date ranges). For records with low confidence, **Gemini** reviews the data, outlines its reasoning, and flags candidates for approval. Reconciliations are finished in minutes instead of hours.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js (App Router), Tailwind CSS v4, Vanilla CSS
* **Backend**: NestJS, TypeScript
* **Database**: MongoDB (Mongoose models for users, invoices, transactions, and matches)
* **Search & Logs**: Elasticsearch (indexes Dev Studio test runs and Recon fuzzy matches)
* **AI Brain**: Gemini (using `@google/genai` SDK)
* **Monitoring**: Arize (agent accuracy and evaluation tracking)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running instance or URI)
- Elasticsearch (running instance or Cloud URL)

### Environment Variables

#### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/paylens
JWT_SECRET=your_jwt_secret_token_here

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Elasticsearch (Optional: If not set, logging falls back to debug warnings)
ELASTIC_URL=http://localhost:9200
ELASTIC_API_KEY=your_elastic_api_key_optional
```

#### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend/` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 💻 Running the App

### 1. Install Dependencies
Run in both directories:
```bash
# In backend/
npm install

# In frontend/
npm install
```

### 2. Start Backend Server
```bash
cd backend/
npm run start:dev
```
The backend server runs on `http://localhost:3001`.

### 3. Start Frontend Dev Server
```bash
cd frontend/
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🔑 Login & Guest Experience

For testing and demonstration convenience, PayLens features two authentication modes:

1. **Standard Sign In / Registration**: 
   Create a secure account on the Register page. Accounts are hashed with `bcryptjs` and secured with JWT tokens.
2. **Continue as Guest (Anonymous Mode)**: 
   Click **"Continue as Guest"** on the Login screen to bypass registration. The frontend uses a local guest session, and the backend handles all simulations, logging, and matches using a fallback `anonymous` user scope. No registrations are required to inspect the platform!

---

## 📂 Project Structure

```
paylens/
├── backend/                   # NestJS Application
│   ├── src/
│   │   ├── auth/              # JWT Strategy and Optional Auth Guards
│   │   ├── dev-studio/        # Stripe sandbox payment simulator logic
│   │   ├── recon-studio/      # CSV invoice parsing and reconciliation
│   │   ├── elastic/           # Elasticsearch client configuration
│   │   ├── gemini/            # Google GenAI model interactions
│   │   ├── schemas/           # MongoDB Mongoose schemas
│   │   └── main.ts            # Entrypoint
│   └── package.json
│
├── frontend/                  # Next.js Application
│   ├── app/
│   │   ├── (auth)/            # Login, Registration pages
│   │   ├── (dashboard)/       # User Dashboard, Dev Studio, and Recon Studio pages
│   │   ├── _components/       # Shared Sidebar, AuthGuard
│   │   └── _lib/              # HTTP fetch helper (api.ts)
│   └── package.json
└── PayLens_Project_Brief.md   # Core Hackathon requirements
```
