import React, { useEffect, useState } from 'react';
import Lang from '../Lang';
import logo from '../../assets/img/logo.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faHouse } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Timer from '../Timer';
import SettingPopup from '../SettingPopup';
import Time from '../Time';
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
                        {/* <NavLink to="/system">
                            <FontAwesomeIcon icon={faGear} />
                        </NavLink> */}
                        <SettingPopup/>
                    </div>
                    <div>
                        <Lang />
                    </div>
                </div>
                <div className="logo w-1/2 flex justify-end">
                    <img className='h-14' src={logo} alt="" />
                </div>
            </div>
            <Time/>
        </div>
    );
}

export default Header;
