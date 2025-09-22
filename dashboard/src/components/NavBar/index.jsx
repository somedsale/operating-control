import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFan, faGauge, faLightbulb, faPlug, faRectangleList } from '@fortawesome/free-solid-svg-icons';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setActive } from '../../store/activeSlice';
const NavBar = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { value } = useSelector((state) => state.active);
    const handleClick = (id) => {
        dispatch(setActive(id))
    }
    return (
        <div className='min-w-32 w-1/6 uppercase interface:text-2xl text-lg font-bold mt-4 z-10'>
            <NavLink to='/lighting' onClick={() => handleClick('lighting')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'lighting' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>
                    <div>
                        <FontAwesomeIcon icon={faLightbulb} />
                    </div>
                    <div>
                        {t('lighting')}
                    </div>
                </div>
            </NavLink>
            <NavLink to='/ventilation' onClick={() => handleClick('ventilation')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'ventilation' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>                    <div>
                        <FontAwesomeIcon icon={faFan} />
                    </div>
                    <div>
                        {t('ventilation')}
                    </div>
                </div>
            </NavLink>
            <NavLink to="/control" onClick={() => handleClick('control')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'control' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>                    <div>
                        <FontAwesomeIcon icon={faRectangleList} />
                    </div>
                    <div>
                        {t('controls')}
                    </div>
                </div>
            </NavLink>
            <NavLink to='/power' onClick={() => handleClick('power')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'power' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>                    <div>
                        <FontAwesomeIcon icon={faPlug} />
                    </div>
                    <div>
                        {t('power')}
                    </div>
                </div>
            </NavLink>
            <NavLink to='/medical-gas' onClick={() => handleClick('medical-gas')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'medical-gas' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>                    <div>
                        <FontAwesomeIcon icon={faGauge} />
                    </div>
                    <div>
                        {t('gas')}
                    </div>
                </div>
            </NavLink>
            <NavLink to='/music' onClick={() => handleClick('music')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'music' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>                    <div>
                        <FontAwesomeIcon icon={faGauge} />
                    </div>
                    <div>
                        {t('music')}
                    </div>
                </div>
            </NavLink>
            <NavLink to='/history' onClick={() => handleClick('history')}>
                <div className={`text-center cursor-pointer border rounded-lg border-gray-600 mb-3 interface:mb-6 p ${value === 'history' ? 'bg-blue-200 border-blue-500'
                    : 'hover:bg-gray-100'}`}>                    <div>
                        <FontAwesomeIcon icon={faGauge} />
                    </div>
                    <div>
                        {t('history')}
                    </div>
                </div>
            </NavLink>
        </div>
    );
}

export default NavBar;
