import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const ColorAmbient = () => {
    const {t} = useTranslation();
  const [isOn, setIsOn] = useState(true); // Trạng thái ON/OFF
  const [selectedColor, setSelectedColor] = useState('#FFFFFF'); // Màu hiện tại (mặc định là trắng)
  const [brightnessLevel, setBrightnessLevel] = useState(4); // Mức độ sáng (0-7)

  const colorPickerRef = useRef(null);

  // Xử lý toggle ON/OFF
  const handleToggle = () => {
    setIsOn(!isOn);
  };

  // Xử lý chọn màu từ gradient
  const handleColorPick = (e) => {
    if (!isOn) return; // Không chọn màu nếu đang OFF

    const canvas = colorPickerRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Lấy màu tại vị trí click
    const imageData = ctx.getImageData(x, 0, 1, 1).data;
    const rgbColor = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
    setSelectedColor(rgbColor);
  };

  // Tạo gradient màu trên canvas khi component mount
  const initializeCanvas = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);

    // Gradient từ trắng -> các màu -> trắng
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.2, '#FF0000'); // Đỏ
    gradient.addColorStop(0.4, '#00FF00'); // Xanh lá
    gradient.addColorStop(0.6, '#0000FF'); // Xanh dương
    gradient.addColorStop(0.8, '#FF00FF'); // Tím
    gradient.addColorStop(1, '#FFFFFF');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Xử lý tăng/giảm độ sáng
  const handleBrightnessIncrease = () => {
    if (brightnessLevel < 9) {
      setBrightnessLevel(brightnessLevel + 1);
    }
  };

  const handleBrightnessDecrease = () => {
    if (brightnessLevel > 0) {
      setBrightnessLevel(brightnessLevel - 1);
    }
  };

  // Chiều cao tăng dần từ 16px (mức 0) đến 48px (mức 7)
  const getHeight = (index) => {
    const baseHeight = 16;
    const increment = 4;
    return baseHeight + (index * increment);
  };

  return (
    <div className="flex items-center gap-4 p-2">
      {/* Nhãn Color Ambient */}
      {/* <span className="text-lg ">{t('Color Ambient')}</span> */}

      {/* Toggle Switch */}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={isOn}
          onChange={handleToggle}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        <span className="ml-2 text-sm font-medium text-gray-700">{isOn ? 'ON' : 'OFF'}</span>
      </label>

      {/* Thanh chọn màu (canvas) */}
      <canvas
        ref={(canvas) => {
          colorPickerRef.current = canvas;
          initializeCanvas(canvas);
        }}
        width={300}
        height={20}
        className={`border rounded ${isOn ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
        onClick={handleColorPick}
      />

      {/* Hiển thị màu hiện tại */}
      <div
        className="w-6 h-6 interface:w-8 interface:h-8 text-xl border rounded"
        style={{ backgroundColor: selectedColor }}
      />

    </div>
  );
};

export default ColorAmbient;