import CryptoJS from 'crypto-js';

const key = 'phongkarate2022@0987678768887788'; // Phải là chuỗi 32 ký tự tương đương 256-bit

export function decryptString(base64Text: string): string {
  const keyBytes = CryptoJS.enc.Utf8.parse(key);
  const ivBytes = CryptoJS.enc.Utf8.parse('\0'.repeat(16)); // 16 bytes IV giống như new byte[16]

  const encrypted = CryptoJS.enc.Base64.parse(base64Text);

  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: encrypted },
    keyBytes,
    {
      iv: ivBytes,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}
export function encryptString(text: string): string {
    const iv = CryptoJS.enc.Utf8.parse('\0'.repeat(16));
    const keyBytes = CryptoJS.enc.Utf8.parse(key); // 32 ký tự UTF-8 = 256-bit
    const encrypted = CryptoJS.AES.encrypt(text, keyBytes, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
  
    return encrypted.toString(); // Base64 output
  }
