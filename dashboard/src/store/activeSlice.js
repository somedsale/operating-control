import { createSlice } from '@reduxjs/toolkit';

const activeSlice = createSlice({
    name: 'active',
    initialState: {
        value: 'lighting',
    },
    reducers: {
        setActive: (state, action) => {
            state.value = action.payload;
        },
    },
});

export const { setActive} = activeSlice.actions;
export default activeSlice.reducer;