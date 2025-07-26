import Sound from 'react-native-sound';
import { name as appName } from './app.json';

// Cấu hình âm thanh
Sound.setCategory('Playback');

// Mapping từ từ tiếng Việt sang tên file .mp3
const wordToFileMap: { [key: string]: string } = {
  'moiso': 'moiso',
  'một': 'mot',
  'hai': 'hai',
  'ba': 'ba',
  'bốn': 'bon',
  'năm': 'nam',
  'sáu': 'sau',
  'bảy': 'bay',
  'tám': 'tam',
  'chín': 'chin',
  'không': 'khong',
  'denbanso': 'denbanso',
};

// Chuẩn hóa chuỗi nhập: gộp cụm từ nếu cần
const normalizeInput = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/đến bàn số/g, 'denbanso')
    .replace(/mời số/g, 'moiso')
    .replace(/[^\p{L}\s]/gu, ''); // loại bỏ dấu câu
};

// Tách từ → danh sách tên file âm thanh
const textToAudioFiles = (input: string): string[] => {
  const cleaned = normalizeInput(input);
  return cleaned
    .split(' ')
    .map((word) => wordToFileMap[word] || word)
    .filter(Boolean); // loại undefined/rỗng
};

 
const isNumberWord = (word: string): boolean => {
  return ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'].includes(word);
};
type AudioChunk = {
  type: 'normal' | 'fast';
  files: string[];
};

const groupAudioFiles = (input: string): AudioChunk[] => {
  const normalized = input
    .toLowerCase()
     .replace(/đến bàn số/g, 'denbanso')
    .replace(/mời số/g, 'moiso')
    .replace(/[^\p{L}\s]/gu, '')
    .split(' ');

  const chunks: AudioChunk[] = [];
  let currentChunk: AudioChunk | null = null;

  for (const word of normalized) {
    const file = wordToFileMap[word];
    if (!file) continue;

    const type = isNumberWord(word) ? 'fast' : 'normal';

    if (!currentChunk || currentChunk.type !== type) {
      currentChunk = { type, files: [] };
      chunks.push(currentChunk);
    }

    currentChunk.files.push(file);
  }

  return chunks;
};
// Phát toàn bộ các chunk
const playSequenceWithSpeedControl = async (chunks: AudioChunk[]): Promise<void> => {
  for (const chunk of chunks) {
    await playChunk(chunk);
  }
};
const testSound = () => {
    Sound.setCategory('Playback');
  const filename = 'mot.mp3';
  const sound = new Sound(`${filename}`, Sound.MAIN_BUNDLE, (error) => {
    if (error) {
        console.log('Sound.MAIN_BUNDLE', Sound.MAIN_BUNDLE);
      console.log('❌ Lỗi mở file:', filename);
      console.log('Chi tiết lỗi:', error);
      return;
    }
    console.log('✅ Đã load file:', filename);
    sound.play((success) => {
      if (success) {
        console.log('🔊 Phát thành công');
      } else {
        console.log('❌ Phát thất bại');
      }
      sound.release();
    });
  });
};
// Phát từng file âm thanh trong chunk, theo tốc độ
const playChunk = async (chunk: AudioChunk): Promise<void> => {
     
testSound();
return;
  for (const filename of chunk.files) {
    await new Promise<void>((resolve) => {

    console.log('doc file mp3', `sounds/${filename}.mp3`);
      const sound = new Sound(`sounds/${filename}.mp3`, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('Lỗi mở file:', filename);
          console.log('❌ Chi tiết lỗi:', JSON.stringify(error));
          resolve(); // Bỏ qua lỗi
          return;
        }

        sound.play((success) => {
          sound.release();
          if (!success) {
            console.log('Lỗi phát:', filename);
          }

          // Không delay nếu là fast
          const delay = chunk.type === 'fast' ? 0 : 100;
          setTimeout(resolve, delay);
        });
      });
    });
  }
};
const playSequence = (filenames: string[]) => {
  const playNext = (index: number) => {
    if (index >= filenames.length) return;
const packageName = 'com.intest'; // ⚠️ thay bằng package name của bạn
    const path = `android.resource://${packageName}/raw/${filenames[index]}`;
    const sound = new Sound(`sounds/${filenames[index]}.mp3`, Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Lỗi khi mở file:', filenames[index], error);
        return;
      }

      // Phát file .mp3
      sound.play((success) => {
        sound.release();
        if (success) {
          // GỌI NGAY file kế tiếp — không cần delay
          playNext(index + 1);
        } else {
          console.log('Phát lỗi:', filenames[index]);
        }
      });
    });
  };

  playNext(0);
};
 
export const speakTextSmart = async (input: string): Promise<void> => {
  const chunks = groupAudioFiles(input);
  console.log('chunks', chunks);
  await playSequenceWithSpeedControl(chunks);
};
// Hàm chính để gọi từ app
export const speakText = (input: string) => {
  const files = textToAudioFiles(input);
  console.log('Danh sách file:', files); // debug
  playSequence(files);
};
