import React from 'react';

const Divider = ({label}) => {
  return (
    <div className="relative flex items-center justify-center mb-4">
      <span className="interface:text-6xl text-2xl font-bold text-gray-700 bg-blue-50 px-2 z-10">
        {label}
      </span>
      <div className="absolute w-full interface:h-[2px] h-px bg-gray-400 rounded-full top-1/2"></div>
    </div>
  );
};

export default Divider;