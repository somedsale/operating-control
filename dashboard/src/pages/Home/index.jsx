import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Giả sử bạn dùng react-i18next
import logo from '../../assets/img/logo.png'
import { NavLink } from 'react-router-dom';
import ToggleFullscreen from '../../components/ToggleFullscreen';
import { useDispatch, useSelector } from 'react-redux';
import { setActive } from '../../store/activeSlice';
function Home() {
    const { t, i18n } = useTranslation();
    const [currentTime, setCurrentTime] = useState(new Date());
    const { value } = useSelector((state) => state.active);
    const dispatch = useDispatch();
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
    dispatch(setActive('lighting'))
  };
    return (
        <div className="w-full px-4">
            <div className='flex justify-around h-20'>
                <div className='w-1/3 flex items-end'>
                {/* <ToggleFullscreen/> */}
                </div>
                <div className='w-1/3 flex justify-center items-center text-xl'>
                    <p>{dayOfWeek} {formattedDate}</p>
                </div>
                <div className='w-1/3 flex justify-end'>
                    <img className='' src={logo} alt="" />
                </div>
            </div>
            <div className='flex justify-center text-9xl'>
                <div className=' border-b-2 border-black rounded-xl'>
                    {formattedTime}
                </div>
            </div>
                <div className='flex justify-center text-4xl'>
                    {t('time')}
                </div>
               <div className='flex justify-center mt-12'>
                 <NavLink to='/lighting' onClick={toggleFullscreen}>
                    <div className='px-16 py-8 uppercase border-2 border-black flex justify-center items-center rounded-lg text-xl'>
                        {t('Go to Control')}
                    </div>
                </NavLink>
               </div>

        </div>
    );
}

export default Home;