import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import Divider from "../../components/Divider";
import { getAllPower } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useDispatch } from "react-redux";

const Power = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const dispatch = useDispatch();
  const fetchData = async () => {
    try {
      const response = await getAllPower();
      setData(response.data);
    } catch (error) {
      dispatch(fetchDataFailure(error.message));
    }
  };
  useEffect(() => {
    fetchData();

  }, [dispatch]);
  return (
    <div className="w-9/12 px-8">
      <div className="w-full text-center capitalize">
        <Divider label={t("power")} />
      </div>
      <div className="w-full flex text-2xl interface:text-5xl capitalize">
        <div className="w-1/3 flex justify-center py-2">
          <div className="text-center">UPS Status</div>
        </div>
        <div className="w-1/3 flex justify-center py-2">
          <div className="text-center">IPS Status</div>
        </div>
        <div className="w-1/3 flex justify-center py-2">
          <div className="text-center">Main Supply Status</div>
        </div>
      </div>
      <div className="w-full flex justify-evenly">
        <div></div>
        <div></div>
        <div></div>
      </div>
      <div className="w-full flex justify-evenly text-lg capitalize">
        {data.map((item) => {
          return (
            <div key={item.id} className="w-1/3 flex justify-center py-2">
              {item.status ? (
                <Normal lable={t("Normal")} />
              ) : (
                <Fault lable={t("fault")} />
              )}
            </div>
          );
        })}
        {/* <div className="w-1/3 flex justify-center py-2">
          <Normal lable={t("Normal")} />
        </div>
        <div className="w-1/3 flex justify-center py-2">
          <Fault lable={t("fault")} />
        </div>
        <div className="w-1/3 flex justify-center py-2">
          <Normal lable={t("Normal")} />
        </div> */}
      </div>
    </div>
  );
};

export default Power;
