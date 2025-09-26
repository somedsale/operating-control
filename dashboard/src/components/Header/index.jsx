import React, { useEffect, useState } from 'react';
import logo from '../../assets/img/LogoMes.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faHouse } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from 'react-router-dom';
const Header = () => {


    return (
        <div className='w-full pb-2'>
            <div className=" w-full h-14 flex px-8 pt-4">
                <div className='w-1/2 flex pt-1'>
                    <div className='mr-12'>
                        <NavLink to="/">
                            <FontAwesomeIcon icon={faHouse} />
                        </NavLink>
                    </div>
                    <div className='mr-12'>
                        <NavLink to="/settings">
                            <FontAwesomeIcon icon={faGear} />
                        </NavLink>
                    </div>
                </div>
                <div className="logo w-1/2 flex justify-end">
                    <img className='h-14' src={logo} alt="" />
                </div>
            </div>
            {/* <Time/> */}
        </div>
    );
}

export default Header;
