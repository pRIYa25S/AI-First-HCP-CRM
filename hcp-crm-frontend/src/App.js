import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { 
  MessageSquare, User, Calendar, Clock, Users, BookOpen, 
  Award, Smile, FileText, Send, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { updateField, setAllFields, addChatMessage, setActiveId, clearForm } from './store';

function App() {
  const dispatch = useDispatch();
  const formData = useSelector((state) => state.interaction.formData);
  const chatHistory = useSelector((state) => state.interaction.chatHistory);
  const activeId = useSelector((state) => state.interaction.activeId);
  
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  const handleInputChange = (field, value) => {
    dispatch(updateField({ field, value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    const getVal = (selector, fallback) => {
      const el = document.querySelector(selector);
      return (el && el.value && el.value.trim() !== "") ? el.value : fallback;
    };

    try {
      const payload = {
        hcp_name: getVal('input[placeholder="Dr. Jane Doe"]', formData.hcp_name || "Unknown Doctor"),
        interaction_type: getVal('select', formData.interaction_type || "Meeting"),
        date: getVal('input[type="date"]', formData.date || "2026-07-08"),
        time: getVal('input[type="time"]', formData.time || "18:43"),
        attendees: getVal('input[placeholder="Medical staff, assistants..."]', formData.attendees || ""),
        topics_discussed: getVal('textarea[placeholder*="What parameters"]', formData.topics_discussed || ""),
        materials_shared: getVal('input[placeholder*="Brochures"]', formData.materials_shared || ""),
        samples_distributed: getVal('input[placeholder*="Product packages"]', formData.samples_distributed || ""),
        sentiment: formData.sentiment || formData.observed_sentiment || "Neutral",
        outcomes: getVal('textarea[placeholder*="Acknowledge"]', formData.outcomes || ""),
        followup_actions: (() => {
          const rawValue = formData.followup_actions || formData.follow_up_actions || getVal('textarea[placeholder*="Next scheduled"]', "");
          return Array.isArray(rawValue) ? rawValue.join(", ") : (rawValue || "");
        })()
      };

      console.log("Submitting verified payload to backend:", payload);

      // 🟢 UPDATED: Points to your live Railway instance
      await axios.post('https://ai-first-hcp-crm-production.up.railway.app/api/interactions', payload);
      
      setStatusMessage({ type: 'success', text: 'Interaction logged successfully to database!' });
      alert('Interaction Logged Successfully into DB!');
      dispatch(clearForm());
    } catch (err) {
      console.error("Axios Submission Failed:", err);
      setStatusMessage({ type: 'error', text: 'Error saving interaction entry.' });
      alert('Error saving interaction entry.');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    dispatch(addChatMessage({ sender: 'user', text: userMsg }));
    setChatInput('');
    setLoading(true);

    try {
      // 🟢 UPDATED: Points to your live Railway instance
      const res = await axios.post('https://ai-first-hcp-crm-production.up.railway.app/api/chat', {
        message: userMsg,
        context_interaction_id: activeId
      });

      dispatch(addChatMessage({ sender: 'ai', text: res.data.reply || "Parsed successfully." }));

      const extracted = res.data.extracted_data;
      if (extracted) {
        dispatch(setAllFields(extracted));
        if (extracted.sentiment) {
          dispatch(updateField({ field: 'sentiment', value: extracted.sentiment }));
          dispatch(updateField({ field: 'observed_sentiment', value: extracted.sentiment }));
        }
        if (extracted.followup_actions) {
          dispatch(updateField({ field: 'followup_actions', value: extracted.followup_actions }));
          dispatch(updateField({ field: 'follow_up_actions', value: extracted.followup_actions }));
        }
      }
    } catch (err) {
      dispatch(addChatMessage({ sender: 'ai', text: 'Error connecting to the AI agent.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: '"Inter", -apple-system, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '32px' }}>
      
      {/* HEADER ROW */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em', margin: 0 }}>HCP Workspace</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Capture structured medical representative notes cleanly.</p>
        </div>
        
        {statusMessage.text && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: statusMessage.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {statusMessage.text}
          </div>
        )}
      </header>

      {/* TWO COLUMN PANEL VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: DATA ENTRY CONTAINER */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ padding: '6px', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '6px' }}><Sparkles size={18}/></div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Interaction Summary</h2>
          </div>
          
          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}><User size={14} style={{ marginRight: '6px' }}/> HCP Name</label>
                <input style={inputStyle} type="text" placeholder="Dr. Jane Doe" value={formData.hcp_name || ''} onChange={(e) => handleInputChange('hcp_name', e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Interaction Type</label>
                <select style={inputStyle} value={formData.interaction_type || 'Meeting'} onChange={(e) => handleInputChange('interaction_type', e.target.value)}>
                  <option value="Meeting">🤝 In-Person Meeting</option>
                  <option value="Call">📞 Phone Call</option>
                  <option value="Email">📧 Email Correspondence</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}><Calendar size={14} style={{ marginRight: '6px' }}/> Date</label>
                <input style={inputStyle} type="date" value={formData.date || ''} onChange={(e) => handleInputChange('date', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}><Clock size={14} style={{ marginRight: '6px' }}/> Time</label>
                <input style={inputStyle} type="time" value={formData.time || ''} onChange={(e) => handleInputChange('time', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}><Users size={14} style={{ marginRight: '6px' }}/> Logged Attendees</label>
              <input style={inputStyle} type="text" placeholder="Medical staff, assistants..." value={formData.attendees || ''} onChange={(e) => handleInputChange('attendees', e.target.value)} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}><BookOpen size={14} style={{ marginRight: '6px' }}/> Topics Discussed</label>
              <textarea style={{...inputStyle, height: '90px', resize: 'vertical'}} placeholder="What parameters or drug profiles were processed?" value={formData.topics_discussed || ''} onChange={(e) => handleInputChange('topics_discussed', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Materials Shared</label>
                <input style={inputStyle} type="text" placeholder="Brochures, studies..." value={formData.materials_shared || ''} onChange={(e) => handleInputChange('materials_shared', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Samples Distributed</label>
                <input style={inputStyle} type="text" placeholder="Product packages..." value={formData.samples_distributed || ''} onChange={(e) => handleInputChange('samples_distributed', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{...labelStyle, marginBottom: '10px'}}><Smile size={14} style={{ marginRight: '6px' }}/> Observed HCP Sentiment</label>
              <div style={{ display: 'flex', gap: '24px' }}>
                {['Positive', 'Neutral', 'Negative'].map((s) => {
                  const isChecked = (formData.sentiment === s || formData.observed_sentiment === s);
                  return (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: isChecked ? '#1e293b' : '#64748b' }}>
                      <input type="radio" name="sentiment" value={s} checked={isChecked} onChange={() => {
                        handleInputChange('sentiment', s);
                        handleInputChange('observed_sentiment', s);
                      }} style={{ accentColor: '#2563eb', transform: 'scale(1.1)' }} />
                      {s === 'Positive' ? '🟢 Positive' : s === 'Negative' ? '🔴 Negative' : '🟡 Neutral'}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}><Award size={14} style={{ marginRight: '6px' }}/> Outcomes & Core Feedback</label>
              <textarea style={{...inputStyle, height: '70px', resize: 'vertical'}} placeholder="Acknowledge agreements or direct pushbacks..." value={formData.outcomes || ''} onChange={(e) => handleInputChange('outcomes', e.target.value)} />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}><FileText size={14} style={{ marginRight: '6px' }}/> Action Items & Follow-ups</label>
              <textarea 
                style={{...inputStyle, height: '70px', resize: 'vertical'}} 
                placeholder="Next scheduled meeting objectives..." 
                value={(() => {
                  const val = formData.followup_actions || formData.follow_up_actions || '';
                  if (Array.isArray(val)) return val.join(', ');
                  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                  return val;
                })()} 
                onChange={(e) => {
                  handleInputChange('followup_actions', e.target.value);
                  handleInputChange('follow_up_actions', e.target.value);
                }} 
              />
            </div>

            <button type="submit" style={submitBtnStyle}>
              Save Document Entry
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE MESSAGING CANVAS */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '780px', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ padding: '20px 24px', backgroundColor: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '8px', color: '#38bdf8' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.01em' }}>AI Assistant Intake</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>LangGraph Cognitive Workflow Running</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#fafafa' }}>
            {chatHistory.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '240px', color: '#94a3b8' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <p style={{ fontSize: '13px', lineHeight: '1.5' }}>Paste your interaction transcript here to auto-populate the record forms.</p>
              </div>
            )}
            
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  backgroundColor: msg.sender === 'user' ? '#2563eb' : '#ffffff',
                  color: msg.sender === 'user' ? '#ffffff' : '#334155',
                  border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                <div style={{ width: '6px', height: '6px', backgroundColor: '#2563eb', borderRadius: '50%' }}></div>
                AI Agent is parsing text unstructured semantics...
              </div>
            )}
          </div>

          <div style={{ padding: '18px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', backgroundColor: '#ffffff' }}>
            <input
              style={{ ...inputStyle, borderRadius: '8px', backgroundColor: '#f8fafc' }}
              type="text"
              placeholder="Paste rep transcript details..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} style={sendBtnStyle}>
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '13px',
  fontWeight: '600',
  marginBottom: '8px',
  color: '#475569'
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#1e293b',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

const submitBtnStyle = {
  width: '100%',
  padding: '14px',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  cursor: 'pointer',
  boxSizing: 'border-box',
  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
};

const sendBtnStyle = {
  padding: '0 16px',
  backgroundColor: '#0f172a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export default App;