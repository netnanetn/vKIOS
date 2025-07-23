import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  GestureResponderEvent,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import 'react-native-url-polyfill/auto';
// import nodejs from 'nodejs-mobile-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { USBPrinter } from 'react-native-thermal-receipt-printer-image-qr';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAutoResetServiceList } from './useAutoResetServiceList';
import { decryptString, encryptString } from './cryptoUtil';
import { startSignalRConnection, sendMessageToGroup } from './signalrService';

import DeviceInfo from 'react-native-device-info';
import SHA256 from 'crypto-js/sha256';
const SECRET_KEY = 'MY_SECRET_KEY';
import ViewShot from 'react-native-view-shot';

interface USBPrinterDevice {
  device_id: string;
  device_name: string;
  product_id: number;
  vendor_id: number;
}
type Service = {
  stt: string;
  dv: string;
  startNumber: number;
  currentNumber: number;
};

const App3: React.FC = () => {
  const [serviceList, setServiceList] = useState<Service[]>([]); // useState([]);
  const STORAGE_KEY = 'SERVICE_LIST';
  const PASSWORD = '123456';
  const HEADER_TEXT_KEY = 'headerText';
  const KIOS_ID = 'KIOS_ID';
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const [deviceId, setDeviceId] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [showModalCode, setShowModalCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useAutoResetServiceList(setServiceList);

  const [message, setMessage] = useState('');
  const [user] = useState('User A');

  const [allowCall, setAllowCall] = useState(false);

  // Dữ liệu mẫu khởi tạo 2
  const initialData = [
    {
      stt: '1',
      dv: 'ĐỊNH DANH ĐIỆN TỬ',
      startNumber: 1001,
      currentNumber: 1001,
    },
    {
      stt: '2',
      dv: 'CĂN CƯỚC CÔNG DÂN',
      startNumber: 2001,
      currentNumber: 2001,
    },
    {
      stt: '3',
      dv: 'CẤP ĐỔI GIẤY PHÉP LÁI XE',
      startNumber: 3001,
      currentNumber: 3001,
    },
    {
      stt: '4',
      dv: 'LĨNH VỰC PHÒNG CHÁY CHỮA CHÁY',
      startNumber: 4001,
      currentNumber: 4001,
    },
  ];
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [printers, setPrinters] = useState<USBPrinterDevice[]>([]);
  const [currentPrinter, setCurrentPrinter] = useState<USBPrinterDevice | null>(
    null,
  );
  const viewShotRef = useRef<ViewShot>(null);
  const hiddenViewShotRef = useRef();
  const [headerText, setHeaderText] = useState('');
  const [kiosId, setKiosId] = useState(0);

  useEffect(() => {
    console.log('bat dau 2');
    const init = async () => {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        setServiceList(JSON.parse(jsonValue));
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
        setServiceList(initialData);
      }
    };
    init();

    const loadHeaderText = async () => {
      const stored = await AsyncStorage.getItem(HEADER_TEXT_KEY);
      if (stored) {
        setHeaderText(stored);
      } else {
        // Mặc định nếu chưa có
        const defaultText = 'XÃ NGHI LỘC - TỈNH NGHỆ AN';
        setHeaderText(defaultText);
        await AsyncStorage.setItem(HEADER_TEXT_KEY, defaultText);
      }
    };

    loadHeaderText();

    const loadkiosid = async () => {
      const stored = await AsyncStorage.getItem(KIOS_ID);
      if (stored) {
        setKiosId(stored);
        console.log('kios', stored);
      } else {
        // Mặc định nếu chưa có
        console.log('kios chưa có', stored);
        const defaultText = '0';
        setKiosId(defaultText);
        await AsyncStorage.setItem(KIOS_ID, defaultText);
      }
    };

    loadkiosid();

    const initCode = async () => {
      const id = await DeviceInfo.getAndroidId();
      setDeviceId(id);

      const status = await AsyncStorage.getItem('isActivated');
      if (status === 'true') {
        setIsActivated(true);
      }
    };
    initCode();

    const loadAllowCallStatus = async () => {
      try {
        const saved = await AsyncStorage.getItem('allowCall');
        if (saved !== null) {
          setAllowCall(saved === 'true');
        }
      } catch (err) {
        console.error('Lỗi khi đọc allowCall', err);
      }
    };

    loadAllowCallStatus();

    console.log('bat dau');
    startSignalRConnection(`${kiosId}`);
    if (Platform.OS === 'android') {
      USBPrinter.init().then(() => {
        USBPrinter.getDeviceList().then((devices: USBPrinterDevice[]) => {
          console.log(devices);
          setPrinters(devices);
          _connectPrinter(devices[0]);
        });
      });
    }
  }, []);

  useEffect(() => {
    console.log('bat dau set lại kios signalr');
    startSignalRConnection(`${kiosId}`);
  }, [kiosId]);
  useEffect(() => {
    console.log('bat dau set lại kios signalr', allowCall);
    if (allowCall) {
      console.log('kích hoạt', allowCall);
      Tts.getInitStatus()
        .then(async () => {
          Tts.engines().then(engines => {
            console.log('Available TTS Engines:', engines);
          });

          Tts.setDefaultLanguage('vi-VN'); // Cần thiết!
          Tts.setDefaultVoice('vi-VN'); // Đúng với ID trong log bạn gửi

          await Tts.speak('Hệ thống lấy số xin chào');
        })
        .catch(err => {
          console.error('TTS init failed:', err);
        });
    } else {
      console.log('huỷ kích hoạt', allowCall);
    }
  }, [allowCall]);

  const checkActivationCode = async () => {
    var decryptCode = decryptString(codeInput);
    var encryptCode = encryptString(deviceId);
    const last6 = encryptCode.slice(-6);
    if (codeInput.toUpperCase() === last6.toUpperCase()) {
      await AsyncStorage.setItem('isActivated', 'true');
      setIsActivated(true);
      setShowModalCode(false);
      Alert.alert('Thành công', 'Ứng dụng đã được kích hoạt.');
    } else {
      Alert.alert('Sai mã', 'Mã không hợp lệ. Vui lòng thử lại.');
    }
  };
  const saveServiceList = async data => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setServiceList(data);
  };
  const increaseNumber = stt => {
    const updatedList = serviceList.map(item =>
      item.stt === stt
        ? { ...item, currentNumber: item.currentNumber + 1 }
        : item,
    );
    saveServiceList(updatedList);
  };
  const resetList = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    setServiceList(initialData);
  };
  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.dv}</Text>
      <Text>Số hiện tại: {item.currentNumber}</Text>
      <Button title="Tăng số" onPress={() => increaseNumber(item.stt)} />
    </View>
  );

  const _connectPrinter = (printer: USBPrinterDevice) => {
    //4070, 33054

    console.log('set ok t');
    USBPrinter.connectPrinter(printer.vendor_id, printer.product_id).then(
      () => {
        console.log('set ok');
        setCurrentPrinter(printer);
      },
    );
  };

  const printTextTest = () => {
    if (currentPrinter) {
      USBPrinter.printText('<C>sample text</C>\n');
    }
  };

  const printNumber = () => {
    if (currentPrinter) {
      //USBPrinter.setEncoding('UTF8');
      USBPrinter.printBill(`
        \x1B\x74\x10 // Example: Set code page (depends on printer manual)
        Chào bạn, đây là tiếng Việt.
        \n\n
      `);
      USBPrinter.printBill(`
        <C><B>Công an tỉnh Nghệ An</B></C>
        <C>bộ phận một cửa</C>
        <C>--------------------------------</C>
        <C>Xử lý vi phạm về trật tự an toàn giao thông</C>
        <C><B>2001</B></C>
        <C>--------------------------------</C>
        <C>Vui lòng chờ đến lượt lấy số thứ tự</C>
        <L>Ngày giờ lấy phiếu: 07-07-2025</L>
        `);
    }
  };
  const postData = async info => {
    try {
      const response = await fetch(
        'https://vkiosapi.phanmem.vip/api/QueueTicket/Create',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImN0eSI6IkpXVCJ9.eyJqdGkiOiI1MDI5MDUzMC05MjMzLTRiZDMtYjg4NC0wNzRmZGUxMGVmNzIiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6WyJjMGUzMzMwOS0xNGIxLTQxZWEtNjlkNC0wOGRkYzJhODRiMzciLCJjMGUzMzMwOS0xNGIxLTQxZWEtNjlkNC0wOGRkYzJhODRiMzciXSwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6InZraW9zMDEiLCJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9lbWFpbGFkZHJlc3MiOiJ0cnVuZ25jLmJrQGdtYWlsLmNvbSIsIkFzcE5ldC5JZGVudGl0eS5TZWN1cml0eVN0YW1wIjoiQlY2VkZPS05aUU1JVlVFMkZYTFNRREU0SUJYS0NVWVEiLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJCYXNpYyIsIkNvbXBhbnlJZCI6IjIiLCJleHAiOjE3NTI1NzI1NjYsImlzcyI6Imh0dHBzOi8vZmxvd2VyYmVhdXR5ZnVsbC52biIsImF1ZCI6Imh0dHBzOi8vZmxvd2VyYmVhdXR5ZnVsbC52biJ9.nFxEWM56hG5fE-yMhHCn4y2rRnrsxDui5rv3ysuIy5w', // nếu có token
          },
          body: JSON.stringify({
            serviceId: info.stt,
            serviceName: info.dv,
            startNumber: info.startNumber.toString(),
            ticketCode: info.currentNumber.toString(),
            companyId: kiosId,
            sourceDevice: 'vKios',
          }),
        },
      );

      const result = await response.json();
      console.log('✅ Kết quả:', result);
    } catch (error) {
      console.error('❌ Lỗi gọi API:', error);
    }
  };
  const resetKiosServiceOnline = async resetListData => {
    try {
      console.log('dt');
      console.log(JSON.stringify(resetListData, null, 2));
      const response = await fetch(
        `https://vkiosapi.phanmem.vip/api/KiosService/ResetKiosService/${kiosId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resetListData),
        },
      );

      const result = await response.json();
      console.log('✅ Kết quả:', result);
    } catch (error) {
      console.error('❌ Lỗi gọi API:', error);
    }
  };

  const captureAndPrint = async stt => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const info = serviceList.find(item => item.stt === stt);
      if (!info) {
        console.error('Không tìm thấy dịch vụ');
        return;
      }
      //gọi api
      console.log(info.currentNumber);
      await postData(info);

      setSelectedInfo(info);

      increaseNumber(stt);

      setTimeout(() => {
        // Tạo ViewShot ẩn, chụp xong callback xử lý
        hiddenViewShotRef.current.capture().then(async base64 => {
          // In ảnh từ base64
          await USBPrinter.printImageBase64(base64);

          //await USBPrinter.printText('\n\n\n');

          // Gửi lệnh cắt giấy sau khi in xong
          await USBPrinter.printText('\x1D\x56\x42\x00');
          // Cắt giấy sau khi in
          // await USBPrinter.printBill('\n\n\n\x1D\x56\x42\x00');

          console.log('In xong');
        });
      }, 200);
    } catch (error) {
      console.error('Lỗi khi in:', error);
      setTimeout(() => setIsProcessing(false), 1000);
    } finally {
      setTimeout(() => setIsProcessing(false), 1000);
    }
  };
  const openConfig = () => {
    setPasswordInput('');
    setShowPasswordModal(true);
  };
  const applyConfig = () => {
    try {
      const parsed = JSON.parse(jsonText);
      saveServiceList(parsed);
      setShowConfigModal(false);
    } catch (e) {
      Alert.alert('JSON không hợp lệ');
    }
  };
  const verifyPassword = () => {
    if (passwordInput === PASSWORD) {
      setShowPasswordModal(false);
      setJsonText(JSON.stringify(serviceList, null, 2));
      setShowConfigModal(true);
    } else {
      Alert.alert('Sai mật khẩu');
    }
  };
  const saveHeaderText = async (text: string) => {
    await AsyncStorage.setItem(HEADER_TEXT_KEY, text);
  };
  const saveKiosId = async (text: string) => {
    await AsyncStorage.setItem(KIOS_ID, text);
    startSignalRConnection(text);
  };
  const handleSpeak = async () => {
    try {
      await Tts.speak('mời số thứ tự 68 vào bàn số 1');
      // await Tts.speak('mời số thứ tự 68 vào bàn số 1'); // Nói lại
    } catch (err) {
      console.warn('Không thể đọc:', err);
    }
  };
  const resetServiceList = async () => {
    const resetList = serviceList.map(item => ({
      ...item,
      currentNumber: item.startNumber,
    }));
    setServiceList(resetList);
    await resetKiosServiceOnline(resetList);

    await AsyncStorage.setItem('SERVICE_LIST', JSON.stringify(resetList));
    console.log('json', resetList);
    // reset online
  };
  const toggleAllowCall = async () => {
    try {
      const newValue = !allowCall;
      setAllowCall(newValue);
      await AsyncStorage.setItem('allowCall', newValue.toString());
      console.log('Đã lưu trạng thái allowCall:', newValue);
    } catch (err) {
      console.error('Lỗi khi lưu allowCall', err);
    }
  };
  return (
    <View style={[styles.container]}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#004aad',
          borderTopRightRadius: 0,
          borderTopLeftRadius: 0,
        }}
      >
        <Text
          style={[
            {
              padding: 10,
              fontSize: 30,
              marginVertical: 12,
              fontWeight: 800,
              paddingRight: 20,
              paddingLeft: 0,
              // borderRightWidth: 1,
              // borderRightColor: '#ffffff',
              color: '#ffffff',
            },
          ]}
        >
          {/* vKIOS */}
        </Text>
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 20,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              marginVertical: 1,
              color: 'white',
              fontWeight: 800,
            }}
          >
            HỆ THỐNG LẤY SỐ THỨ TỰ
          </Text>
          <Text
            style={{
              fontSize: 24,
              marginVertical: 1,
              color: 'white',
              //borderRadius: 8,
              fontWeight: 800,
            }}
          >
            {headerText}
          </Text>
        </View>
      </View>

      <View
        style={{
          display: 'flex',
          backgroundColor: '#ffffff',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: 60,
        }}
      >
        {/* Phần bên trái - cố định 50px */}
        <View style={{ width: 40 }} />

        {/* Phần giữa - co giãn */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 16,
              color: '#004aad',
              fontWeight: '800',
              backgroundColor: '#fbf593',
              paddingVertical: 6,
              paddingHorizontal: 15,
              borderRadius: 30,
            }}
          >
            DANH MỤC LĨNH VỰC, DỊCH VỤ
          </Text>
          <View style={{ flexDirection: 'column', alignItems: 'center' }}>
            {isProcessing ? (
              <ActivityIndicator size="small" style={{}} />
            ) : null}
          </View>
        </View>

        {/* Phần bên phải - cố định 50px */}
        <View
          style={{ width: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <TouchableOpacity
            style={{
              width: 25,
              height: 25,
              opacity: 0.7,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'orange', // hoặc bỏ nếu muốn trong suốt
              borderRadius: 15,
            }}
            onPress={() => openConfig()}
          >
            <Icon name="cog-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.gridContainer,
          serviceList.length <= 5 && { justifyContent: 'center', flex: 1 },
        ]}
      >
        {serviceList.length > 5 ? (
          <View style={[styles.gridRow, { backgroundColor: '#004aad' }]}>
            {/* Cột 2: LĨNH VỰC / DỊCH VỤ - tự co dãn */}
            <View
              style={{
                flex: 1,
                alignItems: 'flex-start',
                paddingLeft: 10,
                marginVertical: 10,
              }}
            >
              <Text style={styles.gridHeaderText}>LĨNH VỰC / DỊCH VỤ</Text>
            </View>

            {/* Cột 3: SỐ TIẾP - cố định */}
            <View
              style={{
                width: 85,
                borderLeftWidth: 1,
                borderLeftColor: '#ffffff',
                marginVertical: 10,
              }}
            >
              <Text style={styles.gridHeaderText}>SỐ TIẾP</Text>
            </View>

            {/* Cột 4: LẤY SỐ - cố định */}
            <View
              style={{
                width: 95,
                borderLeftWidth: 1,
                borderLeftColor: '#ffffff',
                marginVertical: 10,
              }}
            >
              <Text style={styles.gridHeaderText}>LẤY SỐ</Text>
            </View>
          </View>
        ) : null}

        {/* Body */}
        {serviceList.length > 5
          ? // Hiển thị theo kiểu "nhiều mục" (> 5)
            serviceList.map((item, index) => (
              <View key={index} style={styles.gridRow}>
                {/* Hiển thị theo kiểu nhiều mục như bạn đã viết */}
                <View
                  style={{
                    flex: 1,
                    alignItems: 'flex-start',
                    paddingLeft: 10,
                    marginVertical: 13,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '900',
                      textAlign: 'left',
                      alignSelf: 'flex-start',
                    }}
                  >
                    {item.dv}
                  </Text>
                </View>
                <View
                  style={{
                    width: 85,
                    borderLeftWidth: 1,
                    borderLeftColor: '#004aad',
                    marginVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      color: '#004aad',
                      fontSize: 25,
                      fontWeight: '900',
                    }}
                  >
                    {item.currentNumber}
                  </Text>
                </View>
                <View
                  style={{
                    width: 95,
                    borderLeftWidth: 1,
                    borderLeftColor: '#004aad',
                    marginVertical: 10,
                    paddingStart: 5,
                    paddingEnd: 5,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#fbf593',
                      borderRadius: 4,
                      padding: 1,
                      borderRightWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: '#ccc',
                      justifyContent: 'center',
                      opacity: isProcessing ? 0.2 : 1,
                    }}
                    onPress={() => captureAndPrint(item.stt)}
                    disabled={isProcessing}
                  >
                    <Icon
                      name="gesture-tap"
                      style={{ paddingBottom: 5 }}
                      size={26}
                      color="#FB6A09"
                    />
                    <Text
                      style={{
                        color: '#004aad',
                        fontSize: 15,
                        marginRight: 2,
                        fontWeight: '700',
                      }}
                    >
                      LẤY SỐ
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          : // Hiển thị theo kiểu "ít mục" (<= 5)
            serviceList.map((item, index) => (
              <View
                key={index}
                style={{
                  borderRadius: 6,
                  marginVertical: 2,
                  marginTop: 0,
                  marginBottom: 10,
                  padding: 10,
                  backgroundColor: '#004aad',
                  marginHorizontal: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center', // ✅ Căn giữa theo chiều dọc
                  }}
                >
                  {/* Phần Text dịch vụ */}
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text
                      style={{
                        fontSize: 22,
                        color: '#ffffff',
                        flexWrap: 'wrap',
                      }}
                    >
                      {item.dv}
                    </Text>
                  </View>

                  {/* Nút LẤY SỐ */}
                  <TouchableOpacity
                    style={{
                      width: 86,
                      backgroundColor: '#fbf593',
                      borderRadius: 4,
                      paddingVertical: 6,
                      borderRightWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: '#ccc',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: isProcessing ? 0.2 : 1,
                    }}
                    onPress={() => captureAndPrint(item.stt)}
                    disabled={isProcessing}
                  >
                    <Icon
                      name="gesture-tap"
                      size={20}
                      color="#FB6A09"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: '#004aad',
                      }}
                    >
                      LẤY SỐ
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
      </View>

      {/* ViewShot ẩn, nằm ngoài vùng nhìn thấy */}
      <View style={{ position: 'absolute', top: -1000 }}>
        <ViewShot
          ref={hiddenViewShotRef}
          options={{
            format: 'png',
            result: 'base64',
            quality: 1,
          }}
          style={{ width: 444, backgroundColor: 'white' }}
        >
          <View
            style={{ padding: 16, paddingTop: 0, backgroundColor: 'white' }}
          >
            <Text style={{ textAlign: 'center', fontSize: 20 }}>
              HỆ THỐNG LẤY SỐ THỨ TỰ
            </Text>
            <Text
              style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 30 }}
            >
              {headerText}
            </Text>
            <Text style={{ textAlign: 'center' }}>
              ------------------------------
            </Text>
            <Text
              style={{ textAlign: 'center', fontSize: 25, fontWeight: 'bold' }}
            >
              {selectedInfo?.dv}
            </Text>
            <Text
              style={{ textAlign: 'center', fontSize: 50, fontWeight: 'bold' }}
            >
              {selectedInfo?.currentNumber}
            </Text>
            <Text style={{ textAlign: 'center' }}>
              ------------------------------
            </Text>
            <Text style={{ textAlign: 'center', fontSize: 25 }}>
              Vui lòng chờ đến số được gọi
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 22 }}>
              Ngày giờ lấy phiếu: {new Date().toLocaleString('vi-VN')}
            </Text>
            <Text
              style={{ textAlign: 'center', marginTop: 10, fontSize: 22 }}
            ></Text>
            <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 22 }}>
              Xin cảm ơn!
            </Text>
          </View>
        </ViewShot>
      </View>

      {/* Modal nhập mật khẩu */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ marginBottom: 10 }}>Nhập mật khẩu cấu hình:</Text>
            <TextInput
              style={styles.input}
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              placeholder="Mật khẩu"
            />
            <View
              style={{
                flexDirection: 'row',
                marginTop: 15,
                justifyContent: 'space-between',
              }}
            >
              <TouchableOpacity
                style={styles.saveButton}
                onPress={verifyPassword}
              >
                <Text style={{ color: '#fff' }}>Xác nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={{ color: '#fff' }}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Popup cấu hình JSON */}

      <Modal visible={showConfigModal} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <FlatList
            data={serviceList}
            keyExtractor={item => item.stt}
            ListHeaderComponent={
              <>
                <Text
                  style={{
                    fontWeight: 'bold',
                    fontSize: 20,
                    paddingStart: 10,
                    paddingTop: 10,
                    marginBottom: 10,
                    textAlign: 'center',
                    justifyContent: 'center',
                  }}
                >
                  CẤU HÌNH HỆ THỐNG
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: 'white',
                    padding: 5,
                    borderRadius: 10,
                    marginBottom: 10,
                    elevation: 1,
                  }}
                >
                  <TextInput
                    value={headerText}
                    onChangeText={setHeaderText}
                    style={[
                      styles.textInput,
                      {
                        color: 'blue',
                        fontSize: 16,
                        fontWeight: '800',
                        flex: 1,
                        borderWidth: 1,
                        borderRadius: 5,
                        marginLeft: 10,
                        paddingStart: 10,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={{
                      padding: 5,
                      marginLeft: 10,
                      justifyContent: 'center',
                    }}
                    onPress={() => saveHeaderText(headerText)}
                  >
                    <Icon name="content-save" size={30} color="#007bff" />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: 'white',
                    padding: 5,
                    borderRadius: 10,
                    marginBottom: 10,
                    elevation: 1,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 'bold',
                      fontSize: 20,
                      paddingStart: 10,
                      paddingTop: 10,
                      marginBottom: 10,
                      textAlign: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Mã vkios liên kết
                  </Text>
                  <TextInput
                    value={kiosId}
                    onChangeText={setKiosId}
                    style={[
                      styles.textInput,
                      {
                        color: 'blue',
                        fontSize: 16,
                        fontWeight: '800',
                        flex: 1,
                        borderRadius: 5,
                        borderWidth: 1,
                        marginLeft: 10,
                        paddingStart: 10,
                      },
                    ]}
                  />
                  <TouchableOpacity
                    style={{
                      padding: 5,
                      marginLeft: 10,
                      justifyContent: 'center',
                    }}
                    onPress={() => saveKiosId(kiosId)}
                  >
                    <Icon name="content-save" size={30} color="#007bff" />
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: 'white',
                    padding: 5,
                    borderRadius: 10,
                    marginBottom: 10,
                    elevation: 1,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 'bold',
                      fontSize: 20,
                      paddingStart: 10,
                      paddingTop: 10,
                      marginBottom: 10,
                      textAlign: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    Cho phép gọi số:
                  </Text>
                  <Switch
                    value={allowCall}
                    onValueChange={toggleAllowCall}
                    thumbColor={allowCall ? '#0a0' : '#aaa'}
                  />
                </View>
              </>
            }
            renderItem={({ item, index }) => (
              <View style={styles.editItem}>
                {/* KV/Quầy - cố định width */}
                <Text
                  style={[
                    styles.textLine,
                    { width: 40, marginTop: 5, textAlign: 'right' },
                  ]}
                >
                  Q:{item.stt}
                </Text>

                {/* Tên dịch vụ - co dãn linh hoạt */}
                <TextInput
                  value={item.dv}
                  onChangeText={text => {
                    const updated = [...serviceList];
                    updated[index].dv = text;
                    setServiceList(updated);
                  }}
                  style={[
                    styles.inputItem,
                    {
                      flex: 1,
                      marginHorizontal: 2,
                      height: 35,
                      paddingVertical: 4,
                    },
                  ]}
                  placeholder="Nhập tên dịch vụ"
                />

                {/* Số bắt đầu - cố định width */}
                <TextInput
                  value={item.startNumber.toString()}
                  keyboardType="numeric"
                  onChangeText={text => {
                    const updated = [...serviceList];
                    updated[index].startNumber = parseInt(text || '0');
                    setServiceList(updated);
                  }}
                  style={[
                    styles.inputItem,
                    {
                      width: 80,
                      marginHorizontal: 2,
                      height: 35,
                      paddingVertical: 4,
                    },
                  ]}
                  placeholder="Số bắt đầu"
                />

                {/* Số hiện tại - cố định width */}
                <TextInput
                  value={item.currentNumber.toString()}
                  keyboardType="numeric"
                  onChangeText={text => {
                    const updated = [...serviceList];
                    updated[index].currentNumber = parseInt(text || '0');
                    setServiceList(updated);
                  }}
                  style={[
                    styles.inputItem,
                    {
                      width: 65,
                      paddingStart: 10,
                      marginHorizontal: 2,
                      height: 35,
                      paddingVertical: 4,
                    },
                  ]}
                  placeholder="Số thứ tự"
                />

                {/* Nút Xóa - cố định width */}
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    {
                      width: 45,
                      height: 35,
                      paddingVertical: 6,
                      marginLeft: 5,
                    },
                  ]}
                  onPress={() => {
                    const filtered = serviceList.filter((_, i) => i !== index);
                    setServiceList(filtered);
                  }}
                >
                  <Text style={{ color: '#fff', textAlign: 'center' }}>
                    Xóa
                  </Text>
                </TouchableOpacity>
              </View>

              // <View style={styles.editItem}>
              //   <Text style={styles.textLine}>KV/Quầy: {item.stt}</Text>

              //   <TextInput
              //     value={item.dv}
              //     onChangeText={text => {
              //       const updated = [...serviceList];
              //       updated[index].dv = text;
              //       setServiceList(updated);
              //     }}
              //     style={styles.inputItem}
              //     placeholder="Nhập tên dịch vụ"
              //   />

              //   <TextInput
              //     value={item.startNumber.toString()}
              //     keyboardType="numeric"
              //     onChangeText={text => {
              //       const updated = [...serviceList];
              //       updated[index].startNumber = parseInt(text || '0');
              //       setServiceList(updated);
              //     }}
              //     style={styles.inputItem}
              //     placeholder="Số bắt đầu"
              //   />

              //   <TextInput
              //     value={item.currentNumber.toString()}
              //     keyboardType="numeric"
              //     onChangeText={text => {
              //       const updated = [...serviceList];
              //       updated[index].currentNumber = parseInt(text || '0');
              //       setServiceList(updated);
              //     }}
              //     style={styles.inputItem}
              //     placeholder="Nhập số thứ tự"
              //   />

              //   <TouchableOpacity
              //     style={styles.deleteButton}
              //     onPress={() => {
              //       const filtered = serviceList.filter((_, i) => i !== index);
              //       setServiceList(filtered);
              //     }}
              //   >
              //     <Text style={{ color: '#fff', textAlign: 'center' }}>
              //       Xóa
              //     </Text>
              //   </TouchableOpacity>
              // </View>
            )}
            ListFooterComponent={
              <View
                style={{
                  marginTop: 20,
                  marginLeft: 10,
                  marginRight: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                {/* + Thêm dịch vụ */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginRight: 5,
                    backgroundColor: '#007AFF',
                    height: 48,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    const newIndex = serviceList.length + 1;
                    setServiceList([
                      ...serviceList,
                      {
                        stt: newIndex.toString(),
                        dv: 'Dịch vụ mới',
                        startNumber: newIndex * 1000 + 1,
                        currentNumber: newIndex * 1000 + 1,
                      },
                    ]);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    + Thêm dịch vụ
                  </Text>
                </TouchableOpacity>

                {/* Đặt lại số hiện tại */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginHorizontal: 5,
                    backgroundColor: '#f39c12',
                    height: 48,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={resetServiceList}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    Đặt lại số
                  </Text>
                </TouchableOpacity>

                {/* Lưu */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginHorizontal: 5,
                    backgroundColor: 'green',
                    height: 48,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    saveServiceList(serviceList);
                    setShowConfigModal(false);
                  }}
                >
                  <Text style={{ color: '#fff' }}>Lưu</Text>
                </TouchableOpacity>

                {/* Đóng */}
                <TouchableOpacity
                  style={{
                    flex: 1,
                    marginLeft: 5,
                    backgroundColor: 'gray',
                    height: 48,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowConfigModal(false)}
                >
                  <Text style={{ color: '#fff' }}>Đóng</Text>
                </TouchableOpacity>
              </View>

              // <View style={{ marginTop: 20 }}>
              //   <TouchableOpacity
              //     style={styles.addButton}
              //     onPress={() => {
              //       const newIndex = serviceList.length + 1;
              //       setServiceList([
              //         ...serviceList,
              //         {
              //           stt: newIndex.toString(),
              //           dv: 'Dịch vụ mới',
              //           startNumber: 1000,
              //           currentNumber: 1000 + newIndex,
              //         },
              //       ]);
              //     }}
              //   >
              //     <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              //       + Thêm dịch vụ
              //     </Text>
              //   </TouchableOpacity>

              //   <View
              //     style={{
              //       flexDirection: 'row',
              //       justifyContent: 'space-around',
              //       marginTop: 20,
              //     }}
              //   >
              //     <TouchableOpacity
              //       style={styles.saveButton}
              //       onPress={() => {
              //         saveServiceList(serviceList);
              //         setShowConfigModal(false);
              //       }}
              //     >
              //       <Text style={{ color: '#fff' }}>Lưu</Text>
              //     </TouchableOpacity>
              //     <TouchableOpacity
              //       style={styles.cancelButton}
              //       onPress={() => setShowConfigModal(false)}
              //     >
              //       <Text style={{ color: '#fff' }}>Đóng</Text>
              //     </TouchableOpacity>
              //   </View>
              // </View>
            }
          />
        </KeyboardAvoidingView>
      </Modal>

      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1, width: '80%', display: 'none' }}
        onPress={() => {
          if (!isActivated) setShowModalCode(true);
        }}
      >
        <View
          style={[
            {
              flex: 1,
              flexDirection: 'row',
              position: 'absolute',
              bottom: 0,
              width: '100%',
              padding: 20,
              marginLeft: 50,
              marginRight: 100,
              borderColor: '#ccc',
              alignItems: 'center',
              backgroundColor: '#f4f6f8',
            },
            !isActivated && { opacity: 0.3 },
          ]}
        >
          {/* Nội dung app */}

          {/* Hiển thị Device ID và trạng thái */}
          <View
            style={{
              position: 'absolute',
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              bottom: 10,
              left: 20,
              right: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12 }} selectable>
              Thiết bị: {deviceId}
            </Text>
            <Text
              style={{ fontSize: 12, color: isActivated ? 'green' : 'red' }}
            >
              Trạng thái: {isActivated ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
            </Text>
          </View>
        </View>

        {/* Modal nhập mã unlock */}
        <Modal visible={showModalCode} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
                Nhập mã kích hoạt
              </Text>
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="Mã unlock"
                style={styles.input}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}
              >
                <TouchableOpacity
                  onPress={checkActivationCode}
                  style={{
                    backgroundColor: '#28a745',
                    padding: 10,
                    borderRadius: 8,
                    flex: 1,
                    marginRight: 5,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff' }}>Xác nhận</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowModalCode(false)}
                  style={{
                    backgroundColor: '#dc3545',
                    padding: 10,
                    borderRadius: 8,
                    flex: 1,
                    marginLeft: 5,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff' }}>Huỷ</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </TouchableOpacity>
      {/* <View
        style={{
          // backgroundColor: '#ffffff',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          height: 50,
          position: 'absolute',
          flex: 1,
          bottom: 10,
          left: 20,
          right: 20,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            color: '#004aad',
            textAlign: 'center',
            fontWeight: 800,
          }}
        >
          VUI LÒNG BẤM LẤY SỐ THEO LĨNH VỰC, DỊCH VỤ{'\n'}
          VÀ LẤY PHIẾU Ở MÁY IN
        </Text>
      </View> */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 50,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fbf593',
        }}
      >
        {/* Bên trái: Nút cấu hình */}
        {/* <TouchableOpacity
    style={{
      width: 25,
      height: 25,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      opacity:.60,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'orange', // hoặc bỏ nếu muốn trong suốt
      borderRadius: 25,
    }}
    onPress={() => openConfig()}
  >
    <Icon name="cog-outline" size={24} color="#fff" />
  </TouchableOpacity> */}

        {/* Giữa: Text căn j giữa */}
        <View style={{ flex: 1, alignItems: 'center', marginLeft: 40 }}>
          <Text
            style={{
              paddingTop: 3,
              fontSize: 12,
              color: '#004aad',
              textAlign: 'center',
              fontWeight: 'bold',
              lineHeight: 21,
            }}
          >
            VUI LÒNG BẤM LẤY SỐ THEO LĨNH VỰC, DỊCH VỤ{'\n'}
            VÀ LẤY PHIẾU Ở MÁY IN PHÍA DƯỚI
          </Text>
        </View>

        {/* Bên phải: chừa khoảng trống 50px */}
        <View style={{ width: 50 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  headerText: {
    padding: 10,
    fontSize: 30,
    marginVertical: 5,
    color: 'green',
    //borderRadius: 8,
    fontWeight: 800,
  },
  buttonText: {
    padding: 10,
    fontSize: 30,
    marginVertical: 5,
    color: 'green',
    //borderRadius: 8,
    fontWeight: 800,
  },
  row: {
    flexDirection: 'row',
    padding: 2,
    borderColor: '#ccc',
  },
  cell: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 2,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    color: 'green',
  },
  header: {
    backgroundColor: 'green',
  },
  headerText1: {
    fontWeight: 'bold',
    color: 'white',
  },
  item: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  title: { fontWeight: 'bold', marginBottom: 5 },
  configButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: 'orange',
    padding: 2,
    borderRadius: 30,
    elevation: 5,
  },
  textArea: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 10,
    textAlignVertical: 'top',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
  },
  saveButton: { backgroundColor: 'green', padding: 12, borderRadius: 8 },
  cancelButton: { backgroundColor: 'gray', padding: 12, borderRadius: 8 },
  textArea1: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 10,
    textAlignVertical: 'top',
    borderRadius: 8,
  },
  textLine: {
    fontWeight: 'bold',
    padding: 5,
    marginTop: 4,
  },
  editItem: {
    backgroundColor: '#f9f9f9',
    padding: 5,
    borderRadius: 4,
    marginBottom: 1,
    elevation: 1,
    flex: 1,
    flexDirection: 'row',
  },
  inputItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 5,
    marginTop: 4,
    marginLeft: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 4,
    marginTop: 5,
    marginLeft: 5,
  },
  saveButton1: {
    backgroundColor: 'green',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton1: {
    backgroundColor: 'gray',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  printText: {
    color: 'green',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '600',
  },
  gridContainer: {
    borderWidth: 0,
    borderColor: '#ccc',
    borderRadius: 0,
    overflow: 'hidden',
  },

  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },

  gridCell: {
    flex: 2,
    padding: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellDichVu: {
    flex: 2,
    padding: 10,
    paddingLeft: 15,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  gridHeaderCell: {
    backgroundColor: '#004aad',
  },

  gridHeaderText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  gridCellText: {
    textAlign: 'center',
    color: '#004aad',
    fontSize: 18,
    fontWeight: 700,
  },

  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8dc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
    margin: 5,
  },

  printText1: {
    marginLeft: 6,
    fontSize: 14,
    color: '#2e7d32',
  },
});

export default App3;
