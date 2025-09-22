import { faHandPointer } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const StandBy = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Cập nhật thời gian mỗi giây
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Dọn dẹp interval khi component unmount
        return () => clearInterval(timer);
    }, []);

    // Định dạng ngày tháng năm
    const formattedDate = currentTime.toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    // Định dạng giờ
    const formattedTime = currentTime.toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
        // second: '2-digit',
        hour12: false
    });

    // Lấy thứ trong tuần
    const dayOfWeek = currentTime.toLocaleDateString(i18n.language, {
        weekday: 'long',
    });
    const handleBackHome = () => {
        navigate('/')
    }
    return (
        <div className='w-screen h-screen bg-emerald-100 cursor-pointer' onClick={handleBackHome}>
            <div className='w-full flex justify-center items-center text-2xl'>
                <p className='pt-8'>{dayOfWeek} {formattedDate}</p>
            </div>
            <div className="grid place-items-center h-screen">
                <h1 className="text-3xl font-bold text-emeralde-900">{t('Tap to return to back home')} <FontAwesomeIcon icon={faHandPointer}/></h1>
            </div>
        </div>
    );
}

export default StandBy;
