import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronUp,
  faClock,
  faClose,
  faFireFlameSimple,
  faPause,
  faPlay,
  faStopwatch20,
  faTemperature0,
} from "@fortawesome/free-solid-svg-icons";
import { useDispatch } from "react-redux";
import {
  decreaseTime,
  pauseTimer,
  resetTimer,
  startTimer,
  startTimerDecrease,
  toggleTimer,
} from "../../store/timerSlice";
import { getHumidity, getTemperature } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";

const Right = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [temp, setTemp] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const fetchTemp = async () => {
    try {
      const response = await getTemperature();
      setTemp(response.data);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const fetchHumd = async () => {
    try {
      const response = await getHumidity();
      setHumidity(response.data);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  
  useEffect(() => {
    // Cập nhật thời gian mỗi giây
    fetchTemp();
      fetchHumd();
    const timer = setInterval(() => {
      fetchTemp();
      fetchHumd();
    }, 10000);

    // Dọn dẹp interval khi component unmount
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="w-1/3 border-l-2 border-black px-4 mt-4">
      <div className=" interface:text-5xl text-2xl mb-4 interface:mb-8">
        <div
          className="inline-block px-2 interface:px-3 interface:py-2 border rounded-lg border-black mr-2 interface:mr-6 cursor-pointer"
          onClick={() => dispatch(startTimer())}
        >
          <FontAwesomeIcon icon={faPlay} />
        </div>
        <div
          className="inline-block px-2 interface:px-3 interface:py-2 border rounded-lg border-black mr-2 interface:mr-6 cursor-pointer"
          onClick={() => dispatch(pauseTimer())}
        >
          <FontAwesomeIcon icon={faPause} />
        </div>
        <div
          className="inline-block px-2 interface:px-3 interface:py-2 border rounded-lg border-black mr-2 interface:mr-6 cursor-pointer"
          onClick={() => dispatch(resetTimer())}
        >
          <FontAwesomeIcon icon={faClose} />
        </div>
        <div
          className="inline-block px-2 interface:px-3 interface:py-2 border rounded-lg border-black mr-2 interface:mr-6 cursor-pointer"
          onClick={() => dispatch(startTimerDecrease())}
        >
          <FontAwesomeIcon icon={faStopwatch20} />
        </div>
        {/* <div className='inline-block px-2 interface:px-3 interface:py-2 border rounded-lg border-black mr-2 interface:mr-6 cursor-pointer'>
                    <FontAwesomeIcon icon={faClock} />
                </div> */}
      </div>
      <div className="w-full interface:text-5xl text-2xl capitalize">
        <div className="w-1/2 inline-block text-left">
          <div>{t("temperature")}</div>
          <div className="my-4 interface:my-8">
            <div className="inline-block pr-2 text-3xl interface:text-4xl">
              <FontAwesomeIcon icon={faTemperature0} />
            </div>
            <div className="inline-block">
              <p className="inline pr-1">{temp}</p>
              <p className="inline pr-2">
                <sup>o</sup>C
              </p>
            </div>
          </div>
          <div>
            <div className="text-center my-2 interface:my-6">{t("set")}</div>
            <div className="text-center">
              <div className="inline-block border-2 border-black rounded-lg px-1 mx-2 cursor-pointer">
                <FontAwesomeIcon icon={faChevronUp} />
              </div>
              <div className="inline-block border-2 border-black rounded-lg px-1 mx-2 ">
                <FontAwesomeIcon icon={faChevronDown} />
              </div>
            </div>
          </div>
        </div>
        <div className="w-1/2 inline-block text-right">
          <div>{t("humidity")}</div>
          <div className="my-4 interface:my-8">
            <div className="inline-block">
              <p className="inline pr-2">{humidity}</p>
              <p className="inline pr-2">H%</p>
            </div>
            <div className="inline-block text-3xl interface:text-4xl">
              <FontAwesomeIcon icon={faFireFlameSimple} />
            </div>
          </div>
          <div>
            <div className="text-center my-2 interface:my-6">{t("set")}</div>
            <div className="text-center">
              <div className="inline-block border-2 border-black rounded-lg px-1 mx-2 cursor-pointer">
                <FontAwesomeIcon icon={faChevronUp} />
              </div>
              <div className="inline-block border-2 border-black rounded-lg px-1 mx-2 cursor-pointer">
                <FontAwesomeIcon icon={faChevronDown} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Right;
