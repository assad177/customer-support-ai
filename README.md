# AI-Powered Customer Support Intelligence System

**Meridian Financial — Support Intelligence Console**

An end-to-end AI system that automatically classifies, analyzes, and responds to financial services customer complaints — combining classical machine learning, sentiment analysis, Retrieval-Augmented Generation (RAG), and agentic decision-making, wrapped in a full-stack authenticated web application.

Built as a final project for an AI/ML Internship.

---

## What It Does

A customer submits a complaint (e.g. *"My credit card was charged twice for the same purchase"*), and the system automatically:

1. **Classifies** the complaint into a category (Credit Card, Credit Reporting, Debt Collection, Mortgages & Loans, or Retail Banking)
2. **Detects sentiment** (Negative / Positive)
3. **Assigns a priority** (High / Medium / Low) based on category and sentiment
4. **Retrieves relevant company policy** using RAG (semantic search over policy documents)
5. **Decides an action** — escalate to a human agent, send a priority automated response, or a standard response
6. **Generates a professional response**, grounded in the retrieved policy and consistent with the chosen action

All of this happens behind a login-protected web application, and every complaint is saved to a per-user history.

---

## Demo

- **Demo video:** [https://drive.google.com/file/d/12v_gvR7miaTkOEbjfd55YX2j7Y7Dojhd/view?usp=sharing]
- **Live app:** Not deployed (see [Limitations](#limitations--future-work)) — see demo video for a full local run-through
- **Project report (PDF):** `ai-internship-report.pdf` in this repo

---

## Screenshots

| Agent View | Customer View |
|---|---|
| *(add screenshot)* | *(add screenshot)* |

| Login | Case History |
|---|---|
| *(add screenshot)* | *(add screenshot)* |

---

## Architecture

```
                     ┌─────────────────────────┐
                     │   Next.js Frontend       │
                     │  (signup / login / UI)   │
                     └────────────┬─────────────┘
                                  │  REST + JWT
                     ┌────────────▼─────────────┐
                     │      FastAPI Backend      │
                     └────────────┬─────────────┘
                                  │
   ┌──────────────┬───────────────┼───────────────┬──────────────┐
   │              │               │               │              │
┌──▼───┐    ┌─────▼─────┐  ┌──────▼──────┐  ┌─────▼─────┐  ┌─────▼─────┐
│Intent │    │ Sentiment │  │  Priority   │  │    RAG    │  │    LLM    │
│Classi-│    │ Analysis  │  │   & Action  │  │ Retrieval │  │  Response │
│fier   │    │(OpenAI)   │  │  (rule-based)│  │(embeddings)│ │Generation │
│(TF-IDF│    │           │  │             │  │+ policy KB │  │ (GPT-4o-  │
│+LogReg)│   │           │  │             │  │            │  │  mini)    │
└───────┘    └───────────┘  └─────────────┘  └────────────┘  └───────────┘
                                  │
                     ┌────────────▼─────────────┐
                     │   SQLite (users +         │
                     │   complaints, per-user)   │
                     └───────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Data handling & EDA | Pandas, Matplotlib, Seaborn |
| Intent classification | TF-IDF + Logistic Regression (scikit-learn) — **83.25% accuracy** |
| Sentiment analysis | HuggingFace Transformers (prototyping) / OpenAI API (deployed) |
| Embeddings & RAG | Sentence-BERT + ChromaDB (prototyping) / OpenAI Embeddings + NumPy cosine similarity (backend) |
| Response generation | OpenAI GPT-4o-mini, custom prompt engineering |
| Backend | FastAPI (Python) |
| Authentication | JWT (`python-jose`), bcrypt password hashing (`passlib`) |
| Database | SQLite |
| Frontend | Next.js, TypeScript, Tailwind CSS |

---

## Dataset

[CFPB Consumer Complaints Dataset](https://www.consumerfinance.gov/data-research/consumer-complaints/) — real complaints filed against U.S. financial institutions. A balanced sample of **10,000 complaints** (2,000 per category) across 5 categories was used for training the intent classifier.

---

## Project Structure

```
customer-support-ai/
├── backend/
│   ├── main.py            # FastAPI app: endpoints, pipeline orchestration
│   ├── database.py        # SQLite setup (users, complaints tables)
│   ├── auth.py             # Password hashing + JWT helpers
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # Main case intake / analysis screen
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── history/page.tsx
│   └── ...
├── models/
│   ├── intent_classifier.pkl
│   └── vectorizer.pkl
├── data/
│   ├── policy_docs.json    # Company policy knowledge base (for RAG)
│   └── chunks_data.json    # Chunked + metadata for retrieval
└── Project_Report.pdf
```

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- An OpenAI API key

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
OPENAI_API_KEY=your-openai-key-here
JWT_SECRET_KEY=any-random-secret-string
```

Run the server:
```bash
uvicorn main:app --reload
```
Backend runs at `http://127.0.0.1:8000` (interactive docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

### Usage
1. Go to `http://localhost:3000/signup`, create an account
2. Submit a complaint on the main page
3. Toggle between **Agent View** (full analysis) and **Customer View** (response only)
4. View past complaints under **History**

---

## Results

- **Intent classification:** 83.25% accuracy on a held-out test set (5 balanced categories)
- **Sentiment analysis:** switched from VADER (unreliable — 52.7% false-positive rate on complaint text) to a context-aware model (98.7% correctly identified as Negative) — see report for full analysis
- **End-to-end pipeline:** verified across multiple complaint categories, producing consistent category, priority, action, and policy-grounded responses

Full methodology and results are documented in `ai-internship-report.pdf`.

---

## Limitations & Future Work

- **Language scope:** English-only in this iteration; Roman Urdu / mixed-language support was scoped out due to time constraints
- **Out-of-scope queries:** general (non-complaint) questions can be misclassified, since training data consists only of complaints
- **Database:** SQLite is file-based; a production deployment would use PostgreSQL
- **Deployment:** currently runs locally; Docker + cloud deployment (Render/Vercel) is a planned next step
- **RAG embeddings:** the deployed backend uses OpenAI embeddings instead of local Sentence-BERT due to local disk-space constraints during development

---

## Author

[Assad Wazeer] — AI/ML Internship, [Track/Cohort]
