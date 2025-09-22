import React, { useEffect, useState } from "react";
import {
  getStatusControlById,
  getStatusLightingById,
  getStatusVentilation,
  TurnOffControlById,
  TurnOffLightingById,
  TurnOffVentilation,
  TurnOnControlById,
  TurnOnLightingById,
  TurnOnVentilation,
} from "../../features/api/apiClient";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useWebSocket } from "../../context/WebSocketContext";

const ToggleSwitch = ({ type, id, label, onChange, checked }) => {
  const [isChecked, setIsChecked] = useState(checked);
  const dispatch = useDispatch();
  const { messages, status, username } = useSelector(
    (state) => state.websocket
  );
  const { sendMessage } = useWebSocket();
  const fetchStatus = async (id) => {
    try {
      if (type == "lighting") {
        const response = await getStatusLightingById(id);
        setIsChecked(response.data.status);
      } else if (type == "control") {
        const response = await getStatusControlById(id);
        setIsChecked(response.data.status);
      }
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const fetchStatusVentilation = async () => {
    try {
      const response = await getStatusVentilation();
      setIsChecked(response.data);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const TurnLighTingOnOrOff = async (id) => {
    if (isChecked) {
      if (status === "connected") {
        sendMessage({ type: "lighting/turn_off", id: id });
      }
    } else {
      if (status === "connected") {
        sendMessage({ type: "lighting/turn_on", id: id });
      }
    }
  };
  const TurnControlOnOrOff = async (id) => {
    if (isChecked) {
      if (status === "connected") {
        sendMessage({ type: "control/turn_off", id: id });
      }
    } else {
      if (status === "connected") {
        sendMessage({ type: "control/turn_on", id: id });
      }
    }
  };
  const TurnVentilationOnOrOff = async () => {
    if (isChecked) {
      if (status === "connected") {
        sendMessage({ type: "ventilation/turn_off" });
      }
    } else {
      if (status === "connected") {
        sendMessage({ type: "ventilation/turn_on" });
      }
    }
  };
  const handleToggle = () => {
    // setIsChecked(!isChecked);
    if (onChange) {
      if (type == "lighting") {
        TurnLighTingOnOrOff(id);
      }
      if (type == "control") {
        TurnControlOnOrOff(id);
      }
      if (type == "ventilation") {
        TurnVentilationOnOrOff();
      }
      // onChange(!isChecked);
    }
  };
  if (type == "ventilation") {
    fetchStatusVentilation();
  } else {
    fetchStatus(id);
  }
  console.log(messages)
  useEffect(() => {
  }, []);
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className={isChecked ? "text-yellow-500" : `text-gray-700`}>
          {label}
        </span>
      )}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleToggle}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
};

export default ToggleSwitch;
