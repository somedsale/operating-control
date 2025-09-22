import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from '../../store/languageSlice';

const Lang = () => {
    const dispatch = useDispatch();
  const currentLanguage = useSelector((state) => state.language.currentLanguage);

  const handleLanguageChange = (lang) => {
    dispatch(setLanguage(lang));
  };
    return (
        <div className="relative">
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-blue-500 text-white rounded px-2 py-1 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="vi">Tiếng Việt</option>
            </select>
          </div>
    );
}

export default Lang;
