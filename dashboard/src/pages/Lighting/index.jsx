import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ToggleSwitch from "../../components/Switch";
import ColorAmbient from "../../components/ColorAmbient";
import Regulation from "../../components/Regulation";
import Divider from "../../components/Divider";
import { useDispatch, useSelector } from "react-redux";
import { fetchDataFailure, fetchLightings } from "../../features/api/apiSlice";
import {
  getAllLightings,
  getStatusLightingById,
} from "../../features/api/apiClient";
const Lighting = () => {
  const { t } = useTranslation();
  const [isToggleOn1, setIsToggleOn1] = useState(false);
  const [isToggleOn2, setIsToggleOn2] = useState(false);
  const [isToggleOn3, setIsToggleOn3] = useState(false);
  const [isToggleOn4, setIsToggleOn4] = useState(false);
  const [isToggleOn, setIsToggleOn] = useState(false);
  const dispatch = useDispatch();
  const handleToggleChange1 = (newState) => {
    setIsToggleOn1(newState);
    // You can perform other actions here based on the state
  };
  const handleToggleChange2 = (newState) => {
    setIsToggleOn2(newState);
    // You can perform other actions here based on the state
  };
  const handleToggleChange3 = (newState) => {
    setIsToggleOn3(newState);
    // You can perform other actions here based on the state
  };
  const handleToggleChange4 = (newState) => {
    setIsToggleOn4(newState);
    // You can perform other actions here based on the state
  };


  return (
    <div className="w-9/12 px-8">
      <div className="w-full text-center capitalize">
        <Divider label={t("lighting")} />
      </div>
      <div className="w-full flex justify-between uppercase text-xl interface:text-3xl  p-1 my-2 interface:p-2 interface:my-4">
        <div className="text-center">
          <div className="py-1">{t("ambient")} 1</div>
          <div className="py-1">
            <ToggleSwitch
              id={1}
              type={"lighting"}
              label={
                <FontAwesomeIcon
                  className={`${isToggleOn1 ? "text-yellow-500" : ``}`}
                  icon={faLightbulb}
                />
              }
              checked={isToggleOn} // Initial state controlled by parent
              onChange={handleToggleChange1}
            />
          </div>
        </div>
        <div className="text-center">
          <div className="py-1">{t("ambient")} 2</div>
          <div className="py-1">
            <ToggleSwitch
              id={2}
              type={"lighting"}
              label={
                <FontAwesomeIcon
                  className={`${isToggleOn2 ? "text-yellow-500" : ``}`}
                  icon={faLightbulb}
                />
              }
              checked={isToggleOn} // Initial state controlled by parent
              onChange={handleToggleChange2}
            />
          </div>
        </div>

        <div className="text-center">
          <div className="py-1">{t("ot")} 1</div>
          <div className="py-1">
            <ToggleSwitch
              id={3}
              type={"lighting"}
              label={
                <FontAwesomeIcon
                  className={`${isToggleOn3 ? "text-yellow-500" : ``}`}
                  icon={faLightbulb}
                />
              }
              checked={isToggleOn} // Initial state controlled by parent
              onChange={handleToggleChange3}
            />
          </div>
        </div>
        <div className="text-center">
          <div className="py-1">{t("ot")} 2</div>
          <div className="py-1">
            <ToggleSwitch
              id={4}
              type={"lighting"}
              label={
                <FontAwesomeIcon
                  className={`${isToggleOn4 ? "text-yellow-500" : ``}`}
                  icon={faLightbulb}
                />
              }
              checked={isToggleOn} // Initial state controlled by parent
              onChange={handleToggleChange4}
            />
          </div>
        </div>
      </div>
      <div className="w-full p-1 my-2 interface:p-2 interface:my-4">
        <Regulation type="lighting" />
      </div>
      <div className="w-full text-2xl interface:text-4xl">
        <div className="w-full p-1 my-2 interface:p-2 interface:my-4">
          <div className="py-2">{t("Color Ambient")}</div>
          <div className="border-b border-gray-500 "></div>
        </div>
        <div className="py-1">
          <ColorAmbient />
        </div>
      </div>
    </div>
  );
};

export default Lighting;
