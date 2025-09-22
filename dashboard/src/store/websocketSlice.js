import { createSlice } from '@reduxjs/toolkit';

const websocketSlice = createSlice({
    name: 'websocket',
    initialState: {
        messages: [],
        status: 'disconnected', // disconnected, connecting, connected
        username: 'Anonymous'
    },
    reducers: {
        setStatus(state, action) {
            state.status = action.payload;
        },
        addMessage(state, action) {
            state.messages.push(action.payload);
        },
        setUsername(state, action) {
            state.username = action.payload;
        },
        clearMessages(state) {
            state.messages = [];
        }
    }
});

export const { setStatus, addMessage, setUsername, clearMessages } = websocketSlice.actions;
export default websocketSlice.reducer;