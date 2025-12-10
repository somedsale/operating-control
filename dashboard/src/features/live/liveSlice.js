import { createSlice } from "@reduxjs/toolkit";

const liveSlice = createSlice({
  name: "live",
  initialState: {
    temp: null,
    humidity: null,
    pressure_filter: null,
    pressure_room: null,
    ts: null, // thời gian cập nhật cuối cùng
  },
  reducers: {
    setLiveData: (state, action) => {
      const payload = action.payload || {};
      if (payload.temp !== undefined) state.temp = payload.temp;
      if (payload.humidity !== undefined) state.humidity = payload.humidity;
      if (payload.pressure_filter !== undefined)
        state.pressure_filter = payload.pressure_filter;
      if (payload.pressure_room !== undefined)
        state.pressure_room = payload.pressure_room;
      state.ts = Date.now();
    },
  },
});

export const { setLiveData } = liveSlice.actions;
export default liveSlice.reducer;
