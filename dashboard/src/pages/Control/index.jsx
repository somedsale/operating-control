import { faLightbulb } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Switch from '../../components/Switch';
import ToggleSwitch from '../../components/Switch';
import Divider from '../../components/Divider';

const Control = () => {
    const { t } = useTranslation();
      const [isToggleOn1, setIsToggleOn1] = useState(false);
      const [isToggleOn2, setIsToggleOn2] = useState(false);
      const [isToggleOn3, setIsToggleOn3] = useState(false);
      const [isToggleOn4, setIsToggleOn4] = useState(false);
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
        <div className='w-9/12 px-8'>
            <div className='w-full text-center capitalize'>
                <Divider label={t('controls')}/>
            </div>
            <div className='w-full flex justify-around uppercase text-2xl interface:text-5xl'>
                <div className='w-1/2 flex justify-around'>
                    <div className='text-center'>
                        <div className='flex justify-center py-2 interface:py-4'>
                            {t('use')}
                        </div>
                        <div className="flex justify-center py-2 interface:py-4">
                            <ToggleSwitch id={1} type="control"
                            checked={isToggleOn1} // Initial state controlled by parent
              onChange={handleToggleChange1}
                            />
                        </div>
                    </div>
                    <div className='text-center'>
                        <div className='flex justify-center py-2 interface:py-4'>
                            {t('free')}
                        </div>
                        <div className="flex justify-center py-2 interface:py-4">
                            <ToggleSwitch id={2} type="control" 
                            checked={isToggleOn2} // Initial state controlled by parent
              onChange={handleToggleChange2}/>
                        </div>
                    </div>
                </div>
                <div className='w-1/2 flex justify-around'>
                    <div className='text-center'>
                        <div className='flex justify-center py-2 interface:py-4'>
                            {t('x-ray')}
                        </div>
                        <div className="flex justify-center py-2 interface:py-4">
                            <ToggleSwitch id={3} type="control" 
                            checked={isToggleOn3} // Initial state controlled by parent
              onChange={handleToggleChange3}/>
                        </div>
                    </div>
                    <div className='text-center'>
                        <div className='flex justify-center py-2 interface:py-4'>
                            {t('uv')}
                        </div>
                        <div className="flex justify-center py-2 interface:py-4">
                            <ToggleSwitch id={4} type="control" 
                            checked={isToggleOn4} // Initial state controlled by parent
              onChange={handleToggleChange4}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Control;
