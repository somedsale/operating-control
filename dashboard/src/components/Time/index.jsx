import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Timer from '../Timer';
const Time = () => {
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
    return (
        <div>
                        <div className='w-full flex justify-center'>
                <div>
                    <div className='time interface:text-2xxl xl:text-9xl lg:text-8xl md:text-7xl border-b-2 border-gray-600 rounded-xl'>
                        {formattedTime}
                    </div>
                    <div className="interface:text-6xl xl:text-2xl lg:text-xl md:text-lg sm:text-xs text-center uppercase">
                        {t('time')}
                    </div>
                </div>
                <div className='flex w-8'>

                </div>
                <div>
                    <div className='time interface:text-2xxl xl:text-9xl lg:text-8xl md:text-7xl border-b-2 border-gray-600 rounded-xl text-red-800'>
                        <Timer />
                    </div>
                    <div className="interface:text-6xl xl:text-2xl lg:text-xl md:text-lg sm:text-xs text-center uppercase">
                        {t('elapsed')}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Time;
