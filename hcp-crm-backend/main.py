import os
import json
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, Date, Time
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# LangGraph & LangChain Dependencies
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict

# ==========================================
# 1. DATABASE CONFIGURATION (SQLite for easy 1-day setup)
# ==========================================
DATABASE_URL = "sqlite:///./hcp_crm.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class InteractionModel(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String(255), index=True)
    interaction_type = Column(String(50), default="Meeting")
    date = Column(String(50))
    time = Column(String(50))
    attendees = Column(Text, nullable=True)
    topics_discussed = Column(Text, nullable=True)
    materials_shared = Column(Text, nullable=True)
    samples_distributed = Column(Text, nullable=True)
    sentiment = Column(String(50), default="Neutral")
    outcomes = Column(Text, nullable=True)
    followup_actions = Column(Text, nullable=True)

class HCPModel(Base):
    __tablename__ = "hcp_directory"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True)
    specialty = Column(String(255))

Base.metadata.create_all(bind=engine)

# Seed Mock HCP Data if table is empty
db = SessionLocal()
if db.query(HCPModel).count() == 0:
    mock_hcps = [
        HCPModel(name="Dr. Jane Smith", specialty="Cardiology"),
        HCPModel(name="Dr. Robert Chen", specialty="Oncology"),
        HCPModel(name="Dr. Sarah Sharma", specialty="Pediatrics"),
        HCPModel(name="Dr. Alan Walker", specialty="Neurology")
    ]
    db.add_all(mock_hcps)
    db.commit()
db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 2. PYDANTIC SCHEMAS
# ==========================================
class InteractionSchema(BaseModel):
    id: Optional[int] = None
    hcp_name: str
    interaction_type: str = "Meeting"
    date: str
    time: str
    attendees: Optional[str] = ""
    topics_discussed: Optional[str] = ""
    materials_shared: Optional[str] = ""
    samples_distributed: Optional[str] = ""
    sentiment: str = "Neutral"
    outcomes: Optional[str] = ""
    followup_actions: Optional[str] = ""

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    context_interaction_id: Optional[int] = None

# ==========================================
# 3. LANGGRAPH AGENT STATE & TOOL DEFINITIONS
# ==========================================
class AgentState(TypedDict):
    user_message: str
    context_id: Optional[int]
    extracted_data: Dict[str, Any]
    selected_tool: str
    tool_output: Dict[str, Any]
    final_response: str

# Initialize LLM (Gemma2-9b-it via Groq)
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1)

# Tool 1: Log Interaction Data Extraction
def tool_log_interaction(text: str) -> dict:
    """Parses unformatted speech or text into structured CRM fields."""
    prompt = f"""
    You are an expert life sciences data extractor. Parse this interaction log text:
    "{text}"
    Extract structural data. Output valid JSON with keys:
    hcp_name, interaction_type, date, time, attendees, topics_discussed, materials_shared, samples_distributed, sentiment, outcomes, followup_actions.
    Use current date "2026-07-08" and time "18:43" if temporal elements are missing. 
    Sentiment must be 'Positive', 'Neutral', or 'Negative'. Return ONLY JSON.
    """
    response = llm.invoke(prompt)
    try:
        return json.loads(response.content.strip().replace("```json", "").replace("```", ""))
    except Exception:
        return {"topics_discussed": text, "sentiment": "Neutral", "hcp_name": "Unknown"}

# Tool 2: Edit Interaction
def tool_edit_interaction(text: str, record_id: int, db: Session) -> dict:
    """Modifies existing logged CRM records."""
    record = db.query(InteractionModel).filter(InteractionModel.id == record_id).first()
    if not record:
        return {"error": f"Record with ID {record_id} not found."}
    
    prompt = f"""
    The user wants to update a CRM log record. Update request: "{text}"
    Current Record values: Name: {record.hcp_name}, Topics: {record.topics_discussed}, Outcome: {record.outcomes}, Followup: {record.followup_actions}.
    Output a JSON containing only the specific keys that need changing along with their updated text values. Return ONLY JSON.
    """
    response = llm.invoke(prompt)
    try:
        updates = json.loads(response.content.strip().replace("```json", "").replace("```", ""))
        for key, val in updates.items():
            if hasattr(record, key):
                setattr(record, key, val)
        db.commit()
        return {"success": True, "updated_fields": updates, "record_id": record_id}
    except Exception as e:
        return {"error": "Failed to parse update updates instruction.", "details": str(e)}

# Tool 3: Search HCP Directory
def tool_search_hcp(text: str, db: Session) -> dict:
    """Searches for registered Medical Professionals in the database directory."""
    hcps = db.query(HCPModel).all()
    hcp_list = ", ".join([h.name for h in hcps])
    prompt = f"From the text: '{text}', match which of these HCPs is being referred to: [{hcp_list}]. Return JSON format with key 'matched_name'."
    res = llm.invoke(prompt)
    try:
        matched = json.loads(res.content.strip().replace("```json", "").replace("```", ""))
        return {"search_results": matched}
    except:
        return {"search_results": {"matched_name": "None"}}

# Tool 4: Suggest Followups
def tool_suggest_followups(text: str) -> dict:
    """Generates next-action actionable task entries based on ongoing discussions."""
    prompt = f"Based on this interaction text: '{text}', suggest 2 bullet points for compliance-friendly next-steps or follow-ups for a medical representative. Return JSON with key 'suggested_followups' as a string list."
    res = llm.invoke(prompt)
    try:
        return json.loads(res.content.strip().replace("```json", "").replace("```", ""))
    except:
        return {"suggested_followups": ["Schedule follow-up meeting in 2 weeks"]}

# Tool 5: Extract Sentiment
def tool_extract_sentiment(text: str) -> dict:
    """Runs isolated emotional analysis to tag professional sentiment."""
    prompt = f"Analyze the professional tone/sentiment of this dialogue: '{text}'. Classify strictly as 'Positive', 'Neutral', or 'Negative'. Return JSON with key 'sentiment'."
    res = llm.invoke(prompt)
    try:
        return json.loads(res.content.strip().replace("```json", "").replace("```", ""))
    except:
        return {"sentiment": "Neutral"}

# ==========================================
# 4. LANGGRAPH ROUTING LOGIC
# ==========================================
def intent_classifier_node(state: AgentState) -> AgentState:
    msg = state["user_message"]
    prompt = f"""
    Analyze the intent of this CRM user message: "{msg}"
    Classify it into exactly one of these tools:
    - log_interaction (if reporting details about a meeting or chat summary)
    - edit_interaction (if asking to correct, modify, or change existing records)
    - search_hcp (if looking for doctor names or matching profiles)
    - suggest_followups (if asking what actions to do next)
    - extract_sentiment (if explicitly asking for sentiment verification)
    
    Return JSON with key 'tool'.
    """
    res = llm.invoke(prompt)
    try:
        tool_choice = json.loads(res.content.strip().replace("```json", "").replace("```", ""))["tool"]
    except:
        tool_choice = "log_interaction"
    
    state["selected_tool"] = tool_choice
    return state

def router_node(state: AgentState):
    return state["selected_tool"]

def execute_tool_node(state: AgentState) -> AgentState:
    tool = state["selected_tool"]
    msg = state["user_message"]
    ctx_id = state["context_id"]
    
    # Open local ephemeral DB session for the runtime context of node execution
    db = SessionLocal()
    try:
        if tool == "log_interaction":
            out = tool_log_interaction(msg)
            state["extracted_data"] = out
            state["tool_output"] = {"status": "Parsed successfully."}
            state["final_response"] = f"Parsed interaction for {out.get('hcp_name', 'HCP')}. Form auto-population synced."
        elif tool == "edit_interaction":
            if not ctx_id:
                state["final_response"] = "Please select or provide an active interaction context ID to make modifications."
                state["tool_output"] = {"error": "Missing context_id"}
            else:
                out = tool_edit_interaction(msg, ctx_id, db)
                state["tool_output"] = out
                state["final_response"] = f"Record ID {ctx_id} successfully updated."
        elif tool == "search_hcp":
            state["tool_output"] = tool_search_hcp(msg, db)
            state["final_response"] = f"Search complete: {state['tool_output']}"
        elif tool == "suggest_followups":
            state["tool_output"] = tool_suggest_followups(msg)
            state["final_response"] = "Suggested medical actions generated based on chat."
        elif tool == "extract_sentiment":
            state["tool_output"] = tool_extract_sentiment(msg)
            state["final_response"] = f"Analyzed Sentiment value: {state['tool_output'].get('sentiment')}"
    finally:
        db.close()
        
    return state

# Compose LangGraph State Machine Workflow Graph
workflow = StateGraph(AgentState)
workflow.add_node("classifier", intent_classifier_node)
workflow.add_node("executor", execute_tool_node)

workflow.set_entry_point("classifier")
workflow.add_conditional_edges(
    "classifier",
    router_node,
    {
        "log_interaction": "executor",
        "edit_interaction": "executor",
        "search_hcp": "executor",
        "suggest_followups": "executor",
        "extract_sentiment": "executor"
    }
)
workflow.add_edge("executor", END)
compiled_agent = workflow.compile()

# ==========================================
# 5. FASTAPI ROUTES
# ==========================================
app = FastAPI(title="AI-First CRM HCP Module Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat")
def handle_ai_chat(req: ChatRequest, db: Session = Depends(get_db)):
    initial_state = {
        "user_message": req.message,
        "context_id": req.context_interaction_id,
        "extracted_data": {},
        "selected_tool": "",
        "tool_output": {},
        "final_response": ""
    }
    output_state = compiled_agent.invoke(initial_state)
    
    # If log interaction tool completed successfully, write down entry immediately to DB
    if output_state["selected_tool"] == "log_interaction" and output_state["extracted_data"]:
        data = output_state["extracted_data"]
        new_log = InteractionModel(
            hcp_name=data.get("hcp_name", "Unknown Doctor"),
            interaction_type=data.get("interaction_type", "Meeting"),
            date=data.get("date", "2026-07-08"),
            time=data.get("time", "18:43"),
            attendees=str(data.get("attendees", "")),
            topics_discussed=str(data.get("topics_discussed", "")),
            materials_shared=str(data.get("materials_shared", "")),
            samples_distributed=str(data.get("samples_distributed", "")),
            sentiment=data.get("sentiment", "Neutral"),
            outcomes=str(data.get("outcomes", "")),
            followup_actions=str(data.get("followup_actions", ""))
        )
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        output_state["tool_output"]["saved_record_id"] = new_log.id
        output_state["extracted_data"]["id"] = new_log.id

    return {
        "reply": output_state["final_response"],
        "tool_used": output_state["selected_tool"],
        "extracted_data": output_state["extracted_data"],
        "tool_output": output_state["tool_output"]
    }

@app.post("/api/interactions", response_model=InteractionSchema)
def create_interaction(item: InteractionSchema, db: Session = Depends(get_db)):
    db_item = InteractionModel(**item.dict(exclude={"id"}))
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/api/interactions", response_model=List[InteractionSchema])
def list_interactions(db: Session = Depends(get_db)):
    return db.query(InteractionModel).all()

@app.get("/api/hcps")
def get_hcp_directory(db: Session = Depends(get_db)):
    return db.query(HCPModel).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)