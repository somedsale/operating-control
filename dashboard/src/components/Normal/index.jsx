import React from "react";

const CHIP_SIZES = {
  sm: "min-w-[6rem]  h-8  text-sm  interface:min-w-[7rem]  interface:h-10  interface:text-xl",
  md: "min-w-[7.5rem] h-9  text-base interface:min-w-[9rem]  interface:h-12  interface:text-2xl",
  lg: "min-w-[9rem]  h-10 text-lg  interface:min-w-[11rem] interface:h-14  interface:text-3xl",
};

const Normal = ({ lable, size = "md" }) => {
  return (
    <div
    style = {{textTransform: 'capitalize'}}
      className={`inline-flex items-center justify-center rounded-full px-4 select-none
                  whitespace-nowrap leading-none text-white bg-green-600 ${CHIP_SIZES[size]}`}
    >
      {lable}
    </div>
  );
};

export default Normal;
