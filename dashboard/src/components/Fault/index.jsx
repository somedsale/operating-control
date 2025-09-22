import React from 'react';

const Fault = ({lable}) => {
    return (
        <div className=" rounded-xl bg-red-700 text-white px-4 min-w-20 text-center">
            {lable}
        </div>
    );
}

export default Fault;
