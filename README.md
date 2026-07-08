\# AI-First Customer Relationship Management (CRM) - HCP Module



An AI-driven Customer Relationship Management (CRM) module tailored for Life Sciences and medical field representatives to seamlessly log and handle Healthcare Professional (HCP) interactions using conversational natural language or structured entries.



\## 🚀 Key Architectural Pillars

\- \*\*Frontend Engine\*\*: React.js with global Redux State Synchronization.

\- \*\*Backend Frame\*\*: Python FastAPI asynchronous application layer.

\- \*\*AI Agent Frame\*\*: LangGraph multi-node state machine orchestration.

\- \*\*Underlying LLM\*\*: Groq Hosted `llama-3.3-70b-versatile` context parsing engine.



\## 🛠️ Operational Agent Tools (LangGraph)

1\. `log\_interaction`: Extracts structured entities (HCP Name, Topics, Sentiment, Materials) from messy conversational audio logs or paragraphs.

2\. `edit\_interaction`: Modifies active database rows utilizing natural language correction commands.

3\. `search\_hcp`: Matches unstructured text mentions against registered Medical Professionals.

4\. `suggest\_followups`: Outputs compliance-friendly next-steps based on conversation text.

5\. `extract\_sentiment`: Runs tone classification tagging entries as Positive, Neutral, or Negative.



\## 🏃 Local Setup \& Execution Guide



\### Backend Initiation

```bash

cd hcp-crm-backend

python -m venv venv

.\\venv\\Scripts\\Activate.ps1

pip install fastapi uvicorn langgraph langchain-groq pydantic sqlalchemy

$env:GROQ\_API\_KEY="gsk\_Gdr5gtq7B1FUk7qnR6xJWGdyb3FYFgQg1pyykNifZ1NyQNU2uqU2"

python main.py

