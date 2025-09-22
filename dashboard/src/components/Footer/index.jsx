import {
  faFire,
  faPowerOff,
  faUserDoctor,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { NavLink } from "react-router-dom";
import { setActive } from "../../store/activeSlice";
import { getAllGas, getStatusGas } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";

const Footer = () => {
  const { t } = useTranslation();
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [statusAgss, setStatusAgss] = useState(0);

  const handlePumpOn = () => {
    if (isPumpOn) {
      setIsPumpOn(false); // Toggle YES/NO cho PUMP
    } else {
      setIsPumpOn(true);
    } // Toggle
  };
  const [data, setData] = useState([]);
  const dispatch = useDispatch();
  const fetchData = async () => {
    try {
      const response = await getAllGas();
      setData(response.data);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  const getStatusAgss = async () => {
    try {
      const response = await getStatusGas(9);
      setStatusAgss(response.data);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  useEffect(() => {
    fetchData();
    getStatusAgss();

  }, [dispatch]);

  return (
    <div className="fixed bottom-px w-full flex justify-between px-8 py-4">
      <div className="min-w-32 w-1/6 uppercase text-lg font-bold mt-4"></div>
      <div className="w-9/12 px-8 flex">
        <div className="pr-12">
          <div className="capitalize text-xl interface:text-4xl mb-4 interface:mb-8">
            {t("medical gas")}
          </div>
          <div>
            {data.slice(0, 7).map((item) => {
              return (
                <NavLink
                  key={item.id}
                  onClick={() => dispatch(setActive("medical-gas"))}
                  to="/medical-gas"
                >
                  <div className="inline-block">
                    <div
                      className={
                        item.status
                          ? "bg-red-700 grid uppercase place-items-center border border-red-700 rounded-lg mx-2 w-12 h-12 interface:w-16 interface:h-16 interface:text-2xl cursor-pointer"
                          : `grid uppercase place-items-center border border-gray-600 rounded-lg mx-2 w-12 h-12 interface:w-16 interface:h-16 interface:text-2xl cursor-pointer`
                      }
                    >
                      {item.keyword}
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
        <div>
          <div className="capitalize text-xl interface:text-4xl mb-4 interface:mb-8">
            {t("AGSS")}
          </div>
          <div className="flex">
            <div onClick={handlePumpOn}>
              <div className="">
                <div className="grid place-items-center border border-gray-600 rounded-lg mr-2 w-12 h-12  interface:w-16 interface:h-16 interface:text-2xl cursor-pointer">
                  PUMP
                  <span className="text-[10px] interface:text-xl">
                    {isPumpOn ? "ON" : "OFF"}
                  </span>
                </div>
              </div>
            </div>
            <NavLink
              onClick={() => dispatch(setActive("medical-gas"))}
              to="/medical-gas"
            >
              <div className="">
                <div
                  className={
                    statusAgss
                      ? "bg-red-700 grid uppercase place-items-center border border-red-700 rounded-lg mx-2 w-12 h-12 interface:w-16 interface:h-16 interface:text-2xl cursor-pointer"
                      : `grid uppercase place-items-center border border-gray-600 rounded-lg mx-2 w-12 h-12 interface:w-16 interface:h-16 interface:text-2xl cursor-pointer`
                  }
                >
                  Agss
                </div>
              </div>
            </NavLink>
          </div>
        </div>
      </div>
      <div className="w-1/3 flex justify-between items-end">
        <div className=" uppercase">
          <div className="px-4 inline-block">
            <NavLink onClick={() => dispatch(setActive("medical-gas"))}>
              <div className="">
                <div className="grid place-items-center border border-gray-600 rounded-lg mx-2 w-12 h-12 interface:w-16 interface:h-16 interface:text-2xl cursor-pointer">
                  <FontAwesomeIcon className="text-red-800" icon={faFire} />
                  {t("fire")}
                </div>
              </div>
            </NavLink>
          </div>
          <div className="inline-block">
            <NavLink onClick={() => dispatch(setActive("medical-gas"))}>
              <div className="">
                <div className="grid place-items-center border border-gray-600 rounded-lg mx-2 w-12 h-12 interface:w-16 interface:h-16 interface:text-2xl cursor-pointer">
                  <FontAwesomeIcon icon={faUserDoctor} />
                  {t("call")}
                </div>
              </div>
            </NavLink>
          </div>
        </div>
        <div>
          <NavLink
            onClick={() => dispatch(setActive("medical-gas"))}
            to="/standby"
          >
            <div className="capitalize flex justify-center items-center border border-gray-600 rounded-xl px-4  h-12 interface:h-16 interface:text-2xl">
              {t("stand by")}
              <span className="px-2">
                <FontAwesomeIcon icon={faPowerOff} />
              </span>
            </div>
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default Footer;
