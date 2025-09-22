import { createSlice } from '@reduxjs/toolkit';

const timerSlice = createSlice({
    name: 'timer',
    initialState: {
        time: 0, // Thời gian hiện tại (giây)
        isRunningIncrement: false, // Trạng thái chạy/dừng
        isRunningDecrease: false, // Trạng thái chạy/dừng

        maxTime: 0, // Thời gian tối đa đạt được
        minTime: 0
    },
    reducers: {
        incrementTime: (state) => {
            state.time += 1;
            if (state.time > state.maxTime) {
                state.maxTime = state.time;
            }
        },
        decreaseTime: (state) => {
            
            if (state.time >0 ) {
                state.time -= 1;
            }
            
        },
        startTimer: (state) => {
            state.isRunningIncrement = true
            state.isRunningDecrease = false

        },
        startTimerDecrease: (state) => {
            state.isRunningDecrease = true
            state.isRunningIncrement = false

        },
        pauseTimer: (state) => {
            state.isRunningIncrement = false;
            state.isRunningDecrease = false;
        },
        resetTimer: (state) => {
            state.time = 0;
            state.isRunningIncrement = false;
            state.isRunningDecrease = false;
        },
        setMaxTime: (state, action) => {
            state.maxTime = action.payload;
        },
        setMinTime: (state, action) => {
            state.minTime = action.payload;
        },
        setTime: (state, action) => {
            state.time = action.payload;

        }
    },
});

export const { incrementTime, decreaseTime, startTimer, pauseTimer, resetTimer, setMaxTime, startTimerDecrease, setTime } = timerSlice.actions;
export default timerSlice.reducer;