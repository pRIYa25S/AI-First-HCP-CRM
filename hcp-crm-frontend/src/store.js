import { configureStore, createSlice } from '@reduxjs/toolkit';

const interactionSlice = createSlice({
  name: 'interaction',
  initialState: {
    formData: {
      hcp_name: '',
      interaction_type: 'Meeting',
      date: '2026-07-08',
      time: '19:18',
      attendees: '',
      topics_discussed: '',
      materials_shared: '',
      samples_distributed: '',
      sentiment: 'Neutral',
      outcomes: '',
      followup_actions: ''
    },
    chatHistory: [
      { sender: 'ai', text: 'Log interaction details here (e.g., "Met Dr. Jane Smith, discussed Product X efficacy, positive sentiment, shared brochure") or ask for help.' }
    ],
    activeId: null
  },
  reducers: {
    updateField: (state, action) => {
      state.formData[action.payload.field] = action.payload.value;
    },
    setAllFields: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    addChatMessage: (state, action) => {
      state.chatHistory.push(action.payload);
    },
    setActiveId: (state, action) => {
      state.activeId = action.payload;
    },
    clearForm: (state) => {
      state.formData = {
        hcp_name: '',
        interaction_type: 'Meeting',
        date: '2026-07-08',
        time: '19:18',
        attendees: '',
        topics_discussed: '',
        materials_shared: '',
        samples_distributed: '',
        sentiment: 'Neutral',
        outcomes: '',
        followup_actions: ''
      };
      state.activeId = null;
    }
  }
});

export const { updateField, setAllFields, addChatMessage, setActiveId, clearForm } = interactionSlice.actions;

export const store = configureStore({
  reducer: {
    interaction: interactionSlice.reducer
  }
});