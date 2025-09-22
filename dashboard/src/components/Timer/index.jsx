import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { incrementTime, toggleTimer, resetTimer, setMaxTime, setTime, decreaseTime } from '../../store/timerSlice';

const Timer = () => {
  const dispatch = useDispatch();
  const { time, isRunningIncrement, isRunningDecrease, maxTime } = useSelector((state) => state.timer);
  const [isEditing, setIsEditing] = useState(false);
  const [inputTime, setInputTime] = useState(0);
  useEffect(() => {
    let interval;
    if (isRunningIncrement) {
      interval = setInterval(() => {
        dispatch(incrementTime());
      }, 1000);
    }
    if (isRunningDecrease) {
      interval = setInterval(() => {
        dispatch(decreaseTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunningIncrement, isRunningDecrease, dispatch]);
  // Handle time input and submission
  const handleTimeChange = (e) => {
    setInputTime(e.target.value);
  };

  const handleTimeSubmit = (e) => {
    if (e.key === 'Enter' && inputTime) {
      const newTime = parseTimeInput(inputTime);
      if (newTime >= 0) {
        dispatch(setTime(newTime));
        setIsEditing(false);
      }
    }
  };
  // Parse input time (HH:MM:SS) to seconds
  const parseTimeInput = (timeStr) => {
    const [hrs = 0, mins = 0, secs = 0] = timeStr.split(':').map(Number);
    return hrs * 3600 + mins * 60 + secs;
  };
  const formatTimeInput = (timeInSeconds) => {
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = timeInSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      <>
        <span>{String(hours).padStart(2, '0')}:</span>
        <span>{String(minutes).padStart(2, '0')}:</span>
        <span className="interface:text-9xl xl:text-7xl">{String(seconds).padStart(2, '0')}</span>
      </>
    );;
  };

  return (
    <div>
      <div className="">
        {isEditing ? (
          <input
            type="text"
            // value={(parseTimeInput(formatTimeInput(inputTime)))}
            onChange={handleTimeChange}
            onKeyDown={handleTimeSubmit}
            onBlur={() => setIsEditing(false)}
            className="w-80 text-center bg-transparent border-b-2 border-red-500 focus:outline-none text-5xl font-mono"
            autoFocus
            placeholder="HH:MM:SS"
          />
        ) : (
          <span
            onClick={() => {
              setIsEditing(true);
              setInputTime(formatTime(time));
            }}
            className="cursor-pointer"
          >
            {formatTime(time)}
          </span>
        )}
      </div>
    </div>
  );
};

export default Timer;