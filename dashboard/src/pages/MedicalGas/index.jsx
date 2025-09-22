import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Divider from "../../components/Divider";
import Normal from "../../components/Normal";
import Fault from "../../components/Fault";
import { getAllGas } from "../../features/api/apiClient";
import { fetchDataFailure } from "../../features/api/apiSlice";
import { useDispatch } from "react-redux";

const MedicalGas = () => {
  const { t } = useTranslation();
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
  useEffect(() => {
    fetchData();
  }, [dispatch]);
  return (
    <div className="w-9/12 px-8">
      <div className="w-full text-center capitalize text-2xl">
        <Divider label={t("medical gas")} />
      </div>
      <div>
        <div className="uppercase flex text-2xl py-1">
          {data.slice(0, 5).map((item) => {
            return (
              <div key={item.id} className="w-1/5 text-center">
                {t(item.name)}
              </div>
            );
          })}
          {/* <div className="w-1/5 text-center">{t("oxygen")}</div>
          <div className="w-1/5 text-center">{t("medical air")}</div>
          <div className="w-1/5 text-center">{t("vacuum")}</div>
          <div className="w-1/5 text-center">{t("carbon dioxide")}</div>
          <div className="w-1/5 text-center">{t("nitrous oxide")}</div> */}
        </div>
        <div className="uppercase flex">
          {data.slice(0, 5).map((item) => {
            if (item.id === 3) {
              return (
                <div key={item.id} className="w-1/5  flex justify-center"></div>
              );
            } else {
              if (item.status === 0 || item.status === 2) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Normal lable={t("high")} />
                    </div>
                  </div>
                );
              }
              if (item.status === 1) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Fault lable={t("high")} />
                    </div>
                  </div>
                );
              }
            }
          })}
          {/* <div className="w-1/5 flex justify-center">
            <div className="w-1/2 my-2">
              <Normal lable={t("high")} />
            </div>
          </div>
          <div className="w-1/5 flex justify-center">
            <div className="w-1/2 my-2">
              <Normal lable={t("high")} />
            </div>
          </div>
          <div className="w-1/5 flex justify-center"></div>
          <div className="w-1/5 flex justify-center">
            <div className="w-1/2 my-2">
              <Normal lable={t("high")} />
            </div>
          </div>
          <div className="w-1/5 flex justify-center">
            <div className="w-1/2 my-2">
              <Normal lable={t("high")} />
            </div>
          </div> */}
        </div>
        <div className="uppercase flex">
          {data.slice(0, 5).map((item) => {
            if (item.status === 0 || item.status === 1) {
              return (
                <div key={item.id} className="w-1/5  flex justify-center">
                  <div className="w-1/2 my-2">
                    <Normal lable={t("low")} />
                  </div>
                </div>
              );
            } else if (item.status === 2) {
              return (
                <div key={item.id} className="w-1/5  flex justify-center">
                  <div className="w-1/2 my-2">
                    <Fault lable={t("low")} />
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
      <div>
        <div className="uppercase flex text-2xl py-1">
          {data.slice(5, 9).map((item) => {
            return (
              <div key={item.id} className="w-1/5 text-center">
                {t(item.name)}
              </div>
            );
          })}
        </div>
        <div className="uppercase flex">
          {data.slice(5, 9).map((item) => {
            if (item.id === 9) {
              if (item.status === 0 || item.status === 2) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Normal lable={t("fault")} />
                    </div>
                  </div>
                );
              }
              if (item.status === 1) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Fault lable={t("fault")} />
                    </div>
                  </div>
                );
              }
            } else {
              if (item.status === 0 || item.status === 2) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Normal lable={t("high")} />
                    </div>
                  </div>
                );
              }
              if (item.status === 1) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Fault lable={t("high")} />
                    </div>
                  </div>
                );
              }
            }
          })}
        </div>
        <div className="uppercase flex">
          {data.slice(5, 9).map((item) => {
            if (item.id === 9) {
              if (item.status === 0 || item.status === 1) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="my-2">
                      <Normal lable={t("emergency")} />
                    </div>
                  </div>
                );
              }
              if (item.status === 2) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="my-2">
                      <Fault lable={t("emergency")} />
                    </div>
                  </div>
                );
              }
            } else {
              if (item.status === 0 || item.status === 1) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Normal lable={t("low")} />
                    </div>
                  </div>
                );
              }
              if (item.status === 2) {
                return (
                  <div key={item.id} className="w-1/5  flex justify-center">
                    <div className="w-1/2 my-2">
                      <Fault lable={t("low")} />
                    </div>
                  </div>
                );
              }
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default MedicalGas;
