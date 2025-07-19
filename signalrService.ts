// signalrService.ts
//https:123.30.240.29:8019/chatHub
// signalrService.ts
import 'react-native-url-polyfill/auto';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HubConnectionBuilder, LogLevel, HubConnection, HubConnectionState } from '@microsoft/signalr';

let connection: HubConnection;

export const startSignalRConnection = async (groupName: string) => {
    console.log('bat dau 31', groupName);
  connection = new HubConnectionBuilder()
    .withUrl('https://vkiosapi.phanmem.vip/chathub') // ⚠️ Đổi IP của server bạn
    .configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();

// 👉 LẮNG NGHE CÁC SỰ KIỆN Ở ĐÂY
  connection.onreconnecting((error) => {
    console.log('🔄 Reconnecting...', error);
  });

 
  connection.onreconnected(async (connectionId) => {
  console.log('✅ Reconnected:', connectionId);
  try {
    await connection.invoke('AddToGroup', groupName);
    console.log(`👥 Re-joined group: ${groupName}`);
  } catch (err) {
    console.error('🚫 Error re-joining group after reconnect:', err);
  }
});

  connection.onclose(async (error) => {
    console.log('❌ Connection closed:', error);
       const reconnect = async () => {
    if (connection && connection.state === HubConnectionState.Disconnected) {
      try {
        await connection.start();
        console.log('✅ SignalR connected again');

        // Gọi lại server để join group
        if(groupName != '0'){
 await connection.invoke('AddToGroup', groupName);
        console.log(`👥 Joined group: ${groupName}`);
        }
       
      } catch (err) {
        console.error('🚫 Reconnect failed. Retrying in 5s...', err);
        setTimeout(reconnect, 5000); // thử lại sau 5 giây
      }
    }
  };

  reconnect(); // bắt đầu reconnect
  });

    console.log('bat dau 32');
console.log(`[${groupName}]`);
  connection.on('ReceiveMessage', async ( message) => {
    console.log(`[${groupName}] : ${message}`);
    const saved = await AsyncStorage.getItem('allowCall');
    console.log('allowCall', allowCall);
    let allowCall = false;
        if (saved !== null) {
          allowCall = saved === 'true';
          if(saved === 'true'){
            console.log('goi so', message);
             Tts.speak(message);
          }
        }
    
  });

  try {
    await connection.start();
    console.log('✅ SignalR connected 2');

    // Gọi server để join vào group
    if(groupName != '0'){
await connection.invoke('AddToGroup', groupName);
    console.log(`👥 Joined group: ${groupName}`);
    }
    
  } catch (err) {
    console.error('❌ SignalR connection error:', err);
  }
};

export const sendMessageToGroup = async (
  groupName: string,
  user: string,
  message: string
) => {
  try {
    await connection.invoke('SendMessageToGroup', groupName, user, message);
  } catch (err) {
    console.error('❌ Error sending message:', err);
  }
};
