import React from "react";

const Divider = ({ label }) => {
  return (
    <div className="flex items-center justify-center mb-4">
      <div className="flex-1 h-px bg-gray-300" />
      <span className="mx-4 interface:text-6xl text-2xl font-bold text-gray-700 capitalize">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  );
};

export default Divider;
