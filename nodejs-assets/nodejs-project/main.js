// const http = require('http');
// const rnBridge = require('rn-bridge');

// const port = 3000;

// // ⚠️ Tránh khởi động lại nhiều lần nếu bị reload
// if (!global.serverStarted) {
//   try {
//     const server = http.createServer((req, res) => {
//       rnBridge.channel.send(`📩 Yêu cầu: ${req.url}`);

//       if (req.url === '/ping') {
//         res.writeHead(200, { 'Content-Type': 'text/plain' });
//         res.end('pong from embedded NodeJS 🎯');
//       } else if (req.url === '/pong') {
//         res.writeHead(200, { 'Content-Type': 'text/plain' });
//         res.end('ping pong from embedded NodeJS 🎯');
//       } else {
//         res.writeHead(404);
//         res.end('404 Not Found');
//       }
//     });

//     server.listen(port, () => {
//       rnBridge.channel.send(`🟢 NodeJS server chạy tại http://localhost:${port}`);
//     });

//     server.on('error', (err) => {
//       rnBridge.channel.send(`❌ Lỗi khi mở cổng ${port}: ${err.message}`);
//     });

//     // Đánh dấu đã khởi động
//     global.serverStarted = true;
//   } catch (err) {
//     rnBridge.channel.send(`🔥 Lỗi nghiêm trọng: ${err.message}`);
//   }
// } else {
//   rnBridge.channel.send('⚠️ NodeJS server đã khởi động trước đó, bỏ qua...');
// }
