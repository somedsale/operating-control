import React, { useEffect, useState } from "react";
import {
  decreaseVentilation,
  getStatusLightingById,
  getVentilation,
  increaseVentilation,
} from "../../features/api/apiClient";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useWebSocket } from "../../context/WebSocketContext";

const Regulation = ({ isOn, type }) => {
  const [level, setLevel] = useState(4); // Mức mặc định là 4 (giữa thang 0-7)
  const [isChecked, setIsChecked] = useState(false);
  const dispatch = useDispatch();
  const { messages, status, username } = useSelector(
    (state) => state.websocket
  );
  const { sendMessage } = useWebSocket();
  const fetchVentilation = async () => {
    try {
      const response = await getVentilation();
      setLevel(response.data.volume);
      setIsChecked(response.data.status);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const fetchLightingStatus = async () => {
    try {
      const response = await getStatusLightingById(1);
      const response1 = await getStatusLightingById(2);

      // setLevel(response.data.volume);
      setIsChecked(response.data.status || response1.data.status);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const handleIncreaseVentilation = async () => {
    try {
      await increaseVentilation();
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const handleDecreaseVentilation = async () => {
    try {
      await decreaseVentilation();
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };

  // Xử lý tăng mức
  const handleIncrease = () => {
    if (level < 9) {
      // setLevel(level + 1);
      if (type == "ventilation") {
        if (status === "connected") {
          sendMessage({ type: "ventilation/increase", volume: level });
        }
      }
    }
  };

  // Xử lý giảm mức
  const handleDecrease = () => {
    if (level > 0) {
      // setLevel(level - 1);
      if (type == "ventilation") {
        if (status === "connected") {
          sendMessage({ type: "ventilation/decrease", volume: level });
        }
      }
    }
  };

  // Chiều cao tăng dần từ 16px (mức 0) đến 48px (mức 7)
  const getHeight = (index) => {
    const baseHeight = 16;
    const increment = 4;
    return baseHeight + index * increment;
  };
  if (type == "ventilation") {
    fetchVentilation();
  } else if (type == "lighting") {
    fetchLightingStatus();
  }
  useEffect(() => {
  }, []);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrease}
        className="w-6 h-6 interface:h-8 interface:w-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300"
        disabled={level === 0 || !isChecked}
      >
        –
      </button>
      <div className="flex gap-1 items-end">
        {[...Array(10)].map((_, index) => (
          <div
            key={index}
            className={`w-2 interface:w-3 rounded-full ${
              index <= level && isChecked ? "bg-gray-600" : "bg-gray-300"
            }`}
            style={{ height: `${getHeight(index)}px` }}
          />
        ))}
      </div>
      <button
        onClick={handleIncrease}
        className="w-6 h-6 interface:h-8 interface:w-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300"
        disabled={level === 9 || !isChecked}
      >
        +
      </button>
    </div>
  );
};

export default Regulation;
