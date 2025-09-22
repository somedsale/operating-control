import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function ToggleFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
    const { t } = useTranslation();

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
  };

  return (
    <div className='w-full'>
      <button onClick={toggleFullscreen} className='w-32 uppercase border-2 border-black text-center flex justify-center items-center rounded-lg text-sm '>
        {/* <div >
                        
                    </div> */}
        {isFullscreen ? `${t('back to windows')}` : `${t('full screen')}`}
      </button>
    </div>
  );
}

export default ToggleFullscreen;