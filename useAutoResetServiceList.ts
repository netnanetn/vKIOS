import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'SERVICE_LIST';
const LAST_DATE_KEY = 'lastResetDate';

const DEFAULT_DATA = [
  { stt: '1', dv: 'Định danh điện tử', currentNumber: 1001 },
  { stt: '2', dv: 'Căn cước công dân', currentNumber: 2001 },
  { stt: '3', dv: 'Cấp đổi giấy phép lái xe', currentNumber: 3001 },
  { stt: '4', dv: 'Phòng cháy chữa cháy', currentNumber: 4001 },
];

const resetCurrentNumbers = (list: any[]) => {
  return list.map(item => ({
    ...item,
    currentNumber: item.startNumber ?? item.currentNumber,
  }));
};

const ensureStartNumbers = (list: any[]) => {
  return list.map(item => ({
    ...item,
    startNumber: item.startNumber ?? item.currentNumber,
  }));
};

export const useAutoResetServiceList = (setServiceList: (list: any[]) => void) => {
  useEffect(() => {
    const checkAndReset = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const lastDate = await AsyncStorage.getItem(LAST_DATE_KEY);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        
        let parsedList = [];
        if (!stored) {
          // ⚠️ Chưa có dữ liệu → khởi tạo mặc định
          parsedList = ensureStartNumbers(DEFAULT_DATA);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsedList));
          await AsyncStorage.setItem(LAST_DATE_KEY, today);
          console.log('🆕 Đã khởi tạo dữ liệu ban đầu');
          setServiceList(parsedList);
          return;
        }

        parsedList = JSON.parse(stored);

        if (!Array.isArray(parsedList)) {
          console.warn('❌ Dữ liệu không hợp lệ');
          return;
        }

        if (lastDate !== today) {
          const resetList = resetCurrentNumbers(parsedList);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resetList));
          await AsyncStorage.setItem(LAST_DATE_KEY, today);
          setServiceList(resetList);
          console.log('✅ Reset currentNumber về startNumber');
        } else {
          setServiceList(parsedList);
        }
      } catch (e) {
        console.error('❌ Lỗi trong useAutoResetServiceList:', e);
        setServiceList(DEFAULT_DATA); // fallback
      }
    };

    checkAndReset();
    const interval = setInterval(checkAndReset, 60 * 60 * 1000); // mỗi giờ  60 * 60 * 1000
    return () => clearInterval(interval);
  }, []);
};
