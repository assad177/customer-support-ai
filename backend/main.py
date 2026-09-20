from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import json
import numpy as np
import os
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

from database import get_connection, init_db
from auth import hash_password, verify_password, create_access_token, verify_token
from fastapi import Depends, HTTPException, Header
from datetime import datetime

app = FastAPI(title="Customer Support Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client setup

client = OpenAI()

# Day 2: Intent classifier load karo
intent_model = pickle.load(open("../models/intent_classifier.pkl", "rb"))
vectorizer = pickle.load(open("../models/vectorizer.pkl", "rb"))

# Day 4: Policy chunks load karo
with open("../data/chunks_data.json", "r") as f:
    chunks_data = json.load(f)
chunks = chunks_data["chunks"]
chunk_metadata = chunks_data["metadata"]

print("Models and data loaded successfully!")

init_db()

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

    



@app.post("/signup")
def signup(request: SignupRequest):
    conn = get_connection()
    cursor = conn.cursor()

    # Check karo email pehle se registered to nahi
    cursor.execute("SELECT id FROM users WHERE email = ?", (request.email,))
    existing_user = cursor.fetchone()
    if existing_user:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    # Password hash karo aur user save karo
    hashed_pw = hash_password(request.password)
    cursor.execute(
        "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (request.name, request.email, hashed_pw, datetime.utcnow().isoformat())
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    # Turant login bhi kar do (token generate karke)
    token = create_access_token({"user_id": user_id, "email": request.email})
    return {"access_token": token, "name": request.name}



def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload 
@app.get("/history")
def get_history(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """SELECT id, query, intent, sentiment, priority, action, response, created_at
           FROM complaints
           WHERE user_id = ?
           ORDER BY created_at DESC""",
        (current_user["user_id"],)
    )
    rows = cursor.fetchall()
    conn.close()

    complaints = []
    for row in rows:
        complaints.append({
            "id": row["id"],
            "query": row["query"],
            "intent": row["intent"],
            "sentiment": row["sentiment"],
            "priority": row["priority"],
            "action": row["action"],
            "response": row["response"],
            "created_at": row["created_at"],
        })

    return {"complaints": complaints}


def get_embedding(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

print("Generating embeddings for policy chunks...")
chunk_embeddings = [get_embedding(chunk) for chunk in chunks]
chunk_embeddings = np.array(chunk_embeddings)
print(f"Generated {len(chunk_embeddings)} embeddings")

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def retrieve_relevant_chunks(query, top_k=2):
    query_embedding = get_embedding(query)
    query_embedding = np.array(query_embedding)
    
    similarities = []
    for chunk_emb in chunk_embeddings:
        sim = cosine_similarity(query_embedding, chunk_emb)
        similarities.append(sim)
    
    similarities = np.array(similarities)
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    retrieved_texts = [chunks[i] for i in top_indices]
    retrieved_categories = [chunk_metadata[i]['category'] for i in top_indices]
    
    return retrieved_texts, retrieved_categories

# ===== Day 3: Sentiment Analysis (via OpenAI, lightweight approach) =====
def get_sentiment(text):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=10,
        messages=[
            {"role": "system", "content": "Classify the sentiment of the following customer complaint as exactly one word: Negative, Neutral, or Positive. Respond with only one word."},
            {"role": "user", "content": text}
        ]
    )
    return response.choices[0].message.content.strip()


# ===== Day 3: Priority Logic =====
def assign_priority(intent, sentiment):
    if sentiment == 'Negative' and intent in ['debt_collection', 'credit_reporting']:
        return 'High'
    elif sentiment == 'Negative':
        return 'Medium'
    else:
        return 'Low'


# ===== Day 5: Action Decision =====
def decide_action(intent, sentiment, priority):
    if priority == 'High' and intent in ['debt_collection', 'credit_reporting']:
        return 'escalate_human'
    elif sentiment == 'Negative':
        return 'priority_response'
    else:
        return 'standard_response'
    


    


# ===== Day 5: Prompt Building =====
def build_prompt(query, intent, sentiment, priority, action, retrieved_context):
    action_instructions = {
        'escalate_human': "This case is being escalated to a human agent. Clearly inform the customer that a human representative will review their case and reach out.",
        'priority_response': "This case is being handled with priority through automated resolution. Do NOT mention escalation to a human agent — explain the resolution process based on the policy instead.",
        'standard_response': "This is a standard query. Provide a helpful, informative response based on the policy."
    }

    system_message = """You are a professional and empathetic customer support assistant for a financial services company. 
Your job is to respond to customer complaints in a helpful, clear, and reassuring tone.

Guidelines:
- Acknowledge the customer's concern with empathy
- Reference the relevant company policy provided to you
- Clearly explain the next steps the customer can expect
- Keep the response concise (3-5 sentences)
- Do not make promises about specific dates or amounts unless mentioned in the policy
- Follow the specific action instruction given to you exactly — do not add or contradict it"""

    user_message = f"""Customer Complaint: {query}

Detected Intent Category: {intent}
Detected Sentiment: {sentiment}
Priority Level: {priority}
Recommended Action: {action}
Action Instruction: {action_instructions[action]}

Relevant Company Policy Information:
{retrieved_context}

Based on the above, write a professional customer support response."""

    return system_message, user_message


# ===== Day 5: Response Generation =====
def generate_response(query, intent, sentiment, priority, action, retrieved_context):
    sys_msg, usr_msg = build_prompt(query, intent, sentiment, priority, action, retrieved_context)
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=250,
        messages=[
            {"role": "system", "content": sys_msg},
            {"role": "user", "content": usr_msg}
        ]
    )
    return response.choices[0].message.content


# ===== Master Function: Sab Kuch Jodta Hai =====
def process_ticket(query):
    # Intent
    query_tfidf = vectorizer.transform([query])
    intent = intent_model.predict(query_tfidf)[0]
    
    # Sentiment
    sentiment = get_sentiment(query)
    
    # Priority
    priority = assign_priority(intent, sentiment)
    
    # RAG retrieval
    retrieved_texts, _ = retrieve_relevant_chunks(query, top_k=2)
    retrieved_context = "\n".join(retrieved_texts)
    
    # Action
    action = decide_action(intent, sentiment, priority)
    
    # Response
    response = generate_response(query, intent, sentiment, priority, action, retrieved_context)
    
    return {
        "query": query,
        "intent": intent,
        "sentiment": sentiment,
        "priority": priority,
        "action": action,
        "response": response
    }

# ===== API Endpoint =====

class TicketRequest(BaseModel):
    query: str

@app.get("/")
def root():
    return {"message": "Customer Support Intelligence API is running"}

@app.post("/analyze")
def analyze_ticket(request: TicketRequest, current_user: dict = Depends(get_current_user)):
    result = process_ticket(request.query)
    
    # Complaint ko database mein save karo
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO complaints (user_id, query, intent, sentiment, priority, action, response, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            current_user["user_id"],
            result["query"],
            result["intent"],
            result["sentiment"],
            result["priority"],
            result["action"],
            result["response"],
            datetime.utcnow().isoformat()
        )
    )
    conn.commit()
    conn.close()
    
    return result

@app.post("/login")
def login(request: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (request.email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"user_id": user["id"], "email": user["email"]})
    return {"access_token": token, "name": user["name"]}


 # contains user_id and email