import React from 'react';
import { useTranslation } from 'react-i18next';
import Divider from '../../components/Divider';

const History = () => {
const logs = [
  {
    timestamp: '2025-05-23T10:30:00+07:00',
    severity: 'error',
    message: 'Áp suất oxy vượt quá ngưỡng cho phép. Kiểm tra hệ thống cung cấp oxy ngay lập tức.',
    details: 'Error: Pressure reading 6.5 bar, exceeds safe limit of 5 bar.',
  },
  {
    timestamp: '2025-05-23T10:32:00+07:00',
    severity: 'warning',
    message: 'Áp suất khí y tế giảm xuống mức thấp. Kiểm tra máy nén khí hoặc rò rỉ.',
    details: 'Warning: Pressure dropped to 2.8 bar, below minimum threshold of 3 bar.',
  },
  {
    timestamp: '2025-05-23T10:33:00+07:00',
    severity: 'error',
    message: 'Hệ thống AGSS gặp sự cố. Khí gây mê có thể tích tụ trong phòng mổ.',
    details: 'Fault: AGSS pump failure detected.',
  },
  {
    timestamp: '2025-05-23T10:34:00+07:00',
    severity: 'warning',
    message: 'Áp suất nitrous oxide thấp. Có thể ảnh hưởng đến quy trình gây mê.',
    details: 'Warning: Pressure at 1.5 bar, below required 2 bar.',
  },
  {
    timestamp: '2025-05-23T10:35:00+07:00',
    severity: 'error',
    message: 'Tình trạng khẩn cấp! Hệ thống khí y tế không hoạt động. Cần can thiệp ngay.',
    details: 'Emergency: System-wide failure detected.',
  },
];
    const { t,i18n } = useTranslation();
    // Hàm format thời gian
    const formatDateTime = (timestamp) => {
        return new Date(timestamp).toLocaleString(i18n.language, {
            dateStyle: 'short',
            timeStyle: 'short',
            hour12:false
        });
    };

    // Hàm lấy màu sắc dựa trên mức độ lỗi
    const getSeverityColor = (severity) => {
        switch (severity.toLowerCase()) {
            case 'error':
                return 'bg-red-100 text-red-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'info':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    return (
        <div className='w-9/12 px-8'>
            <div className='w-full text-center capitalize'>
                <Divider label={t('history')} />
            </div>
            <div className="w-full flex text-lg interface:text-2xl capitalize">
                <div className="w-full mx-auto p-4">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">{t('Error Reporting History')}</h2>
                    <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
                        {logs.length === 0 ? (
                            <p className="p-4 text-gray-500">Không có log lỗi nào để hiển thị.</p>
                        ) : (
                            <div className="space-y-4 p-4">
                                {logs.map((log, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg shadow-sm ${getSeverityColor(log.severity)}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{log.severity.toUpperCase()}</span>
                                            <span className="text-sm interface:text-lg">{formatDateTime(log.timestamp)}</span>
                                        </div>
                                        <p className="mt-2">{log.message}</p>
                                        {log.details && (
                                            <details className="mt-2 text-sm interface:text-lg">
                                                <summary>Chi tiết</summary>
                                                <pre className="bg-gray-200 p-2 rounded mt-1">{log.details}</pre>
                                            </details>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default History;
