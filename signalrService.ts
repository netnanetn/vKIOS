// signalrService.ts
//https:123.30.240.29:8019/chatHub
// signalrService.ts
import 'react-native-url-polyfill/auto';
import Tts from 'react-native-tts';
import { HubConnectionBuilder, LogLevel, HubConnection } from '@microsoft/signalr';

let connection: HubConnection;

export const startSignalRConnection = async (groupName: string) => {
    console.log('bat dau 31');
  connection = new HubConnectionBuilder()
    .withUrl('https://vkiosapi.phanmem.vip/chathub') // ⚠️ Đổi IP của server bạn
    //.configureLogging(LogLevel.Information)
    .withAutomaticReconnect()
    .build();
    console.log('bat dau 32');
console.log(`[${groupName}]`);
  connection.on('ReceiveMessage', ( message) => {
    console.log(`[${groupName}] : ${message}`);
     Tts.speak(message);
  });

  try {
    await connection.start();
    console.log('✅ SignalR connected');

    // Gọi server để join vào group
    await connection.invoke('AddToGroup', groupName);
    console.log(`👥 Joined group: ${groupName}`);
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
