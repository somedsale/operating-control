import { createSlice } from '@reduxjs/toolkit';
import i18n from '../i18n';

const languageSlice = createSlice({
  name: 'language',
  initialState: {
    currentLanguage: i18n.language || 'en', // Lấy ngôn ngữ mặc định từ i18n
  },
  reducers: {
    setLanguage: (state, action) => {
      state.currentLanguage = action.payload;
      i18n.changeLanguage(action.payload); // Thay đổi ngôn ngữ trong i18next
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;