import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Divider from '../../components/Divider';
import axios from 'axios';

const Music = () => {
    const API_KEY=process.env.REACT_APP_API_YOUTUBE_KEY;
  const [searchTerm, setSearchTerm] = useState('');
  const [list,setList] = useState([]);
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;

    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: searchTerm + ' music',
          type: 'video',
          key: API_KEY, // Thay bằng API key thực từ Google Cloud Console
          maxResults: 10
        }
      });

      if (response.data.items.length > 0) {
        setVideoId(response.data.items[0].id.videoId);
        setError('');
      } else {
        setError('Không tìm thấy video nào!');
        setVideoId('');
      }
    } catch (err) {
      setError('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại!');
      setVideoId('');
    }
  };
    const { t } = useTranslation();
    return (
        <div className='w-9/12 px-8'>
            <div className='w-full text-center capitalize'>
                <Divider label={t('music')} />
            </div>
            <div className="w-full flex text-2xl interface:text-5xl capitalize">
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Tìm Kiếm Nhạc YouTube</h1>
      <div className="flex mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nhập tên bài hát hoặc nghệ sĩ..."
          className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="p-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600"
        >
          Tìm
        </button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {videoId && (
        <div className="aspect-w-16 aspect-h-9">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
            </div>
        </div>
    );
}

export default Music;
