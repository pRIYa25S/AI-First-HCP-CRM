import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { MessageSquare, User, Calendar, Clock, Users, BookOpen, Award, Smile, ChevronRight, FileText, Send, RefreshCw } from 'lucide-react';
import { updateField, setAllFields, addChatMessage, setActiveId, clearForm } from './store';

function App() {
  const dispatch = useDispatch();
  const formData = useSelector((state) => state.interaction.formData);
  const chatHistory = useSelector((state) => state.interaction.chatHistory);
  const activeId = useSelector((state) => state.interaction.activeId);
  
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    dispatch(updateField({ field, value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/interactions', formData);
      alert('Interaction Logged Successfully into DB!');
      dispatch(clearForm());
    } catch (err) {
      console.error(err);
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
      const res = await axios.post('http://localhost:8000/api/chat', {
        message: userMsg,
        context_interaction_id: activeId
      });

      dispatch(addChatMessage({ sender: 'ai', text: res.data.reply }));

      // Auto-populate the Left Form Fields natively if tool extracted data!
      if (res.data.tool_used === 'log_interaction' && res.data.extracted_data) {
        dispatch(setAllFields(res.data.extracted_data));
        if (res.data.tool_output?.saved_record_id) {
          dispatch(setActiveId(res.data.tool_output.saved_record_id));
        }
      }
    } catch (err) {
      dispatch(addChatMessage({ sender: 'ai', text: 'Error connecting to the AI agent.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>Log HCP Interaction</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: INTERACTION DETAIL FORM */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1e293b' }}>Interaction Details</h2>
          
          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><User size={16} inline/> HCP Name</label>
                <input style={inputStyle} type="text" placeholder="Search or select HCP..." value={formData.hcp_name} onChange={(e) => handleInputChange('hcp_name', e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Interaction Type</label>
                <select style={inputStyle} value={formData.interaction_type} onChange={(e) => handleInputChange('interaction_type', e.target.value)}>
                  <option value="Meeting">Meeting</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><Calendar size={16}/> Date</label>
                <input style={inputStyle} type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><Clock size={16}/> Time</label>
                <input style={inputStyle} type="time" value={formData.time} onChange={(e) => handleInputChange('time', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><Users size={16}/> Attendees</label>
              <input style={inputStyle} type="text" placeholder="Enter names..." value={formData.attendees} onChange={(e) => handleInputChange('attendees', e.target.value)} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><BookOpen size={16}/> Topics Discussed</label>
              <textarea style={{...inputStyle, height: '80px'}} placeholder="Enter key discussion points..." value={formData.topics_discussed} onChange={(e) => handleInputChange('topics_discussed', e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Materials Shared</label>
                <input style={inputStyle} type="text" placeholder="Brochures, links..." value={formData.materials_shared} onChange={(e) => handleInputChange('materials_shared', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>Samples Distributed</label>
                <input style={inputStyle} type="text" placeholder="Product samples..." value={formData.samples_distributed} onChange={(e) => handleInputChange('samples_distributed', e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><Smile size={16}/> Observed HCP Sentiment</label>
              <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                {['Positive', 'Neutral', 'Negative'].map((s) => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="radio" name="sentiment" value={s} checked={formData.sentiment === s} onChange={() => handleInputChange('sentiment', s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><Award size={16}/> Outcomes</label>
              <textarea style={{...inputStyle, height: '60px'}} placeholder="Key outcomes or agreements..." value={formData.outcomes} onChange={(e) => handleInputChange('outcomes', e.target.value)} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}><FileText size={16}/> Follow-up Actions</label>
              <textarea style={{...inputStyle, height: '60px'}} placeholder="Next steps..." value={formData.followup_actions} onChange={(e) => handleInputChange('followup_actions', e.target.value)} />
            </div>

            <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
              Submit Structured Log
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: AI CONVERSATIONAL SIDEBAR CONTAINER */}
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '16px', backgroundColor: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} />
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>AI Assistant</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>LangGraph Agent Workflow Active</div>
            </div>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  backgroundColor: msg.sender === 'user' ? '#2563eb' : '#f1f5f9',
                  color: msg.sender === 'user' ? '#ffffff' : '#334155'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}><RefreshCw size={12} className="animate-spin" inline/> Agent is processing intent structure...</div>}
          </div>

          <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <input
              style={{ ...inputStyle, marginBottom: 0 }}
              type="text"
              placeholder="Describe interaction or ask tool..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} style={{ padding: '10px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              <Send size={18} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

export default App;