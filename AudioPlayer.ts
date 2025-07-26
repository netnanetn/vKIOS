// File: AudioPlayer.ts (dùng react-native-track-player thay vì react-native-sound)

import TrackPlayer, { Capability } from 'react-native-track-player';


// Khởi tạo Player (gọi 1 lần trong app khi khởi động)
export const setupPlayer = async () => {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
  capabilities: [
    Capability.Play,
    Capability.Stop,
  ],
});
};

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

const normalizeInput = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/\u0111ến bàn số/g, 'denbanso')
    .replace(/mời số/g, 'moiso')
    .replace(/[^\p{L}\s]/gu, '');
};

const textToAudioFiles = (input: string): string[] => {
  const cleaned = normalizeInput(input);
  return cleaned
    .split(' ')
    .map((word) => wordToFileMap[word] || word)
    .filter(Boolean);
};

const isNumberWord = (word: string): boolean => {
  return ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'].includes(word);
};

type AudioChunk = {
  type: 'normal' | 'fast';
  files: string[];
};

const groupAudioFiles = (input: string): AudioChunk[] => {
  const normalized = normalizeInput(input).split(' ');
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

const playChunk = async (chunk: AudioChunk): Promise<void> => {
  const tracks = chunk.files.map((filename, index) => ({
    id: `${Date.now()}-${index}`,
    url: `asset://${filename}.mp3`,
    title: filename,
    artist: 'system',
  }));
  await TrackPlayer.add(tracks);
  await TrackPlayer.play();

  return new Promise((resolve) => {
    setTimeout(() => {
      TrackPlayer.stop();
      resolve();
    }, chunk.type === 'fast' ? 500 * tracks.length : 1000 * tracks.length);
  });
};

const playSequenceWithSpeedControl = async (chunks: AudioChunk[]): Promise<void> => {
  await TrackPlayer.reset();
  for (const chunk of chunks) {
    await playChunk(chunk);
  }
};

const playSequence = async (filenames: string[]) => {
  const tracks = filenames.map((name, index) => ({
    id: `seq-${index}-${name}`,
    url: `asset://${name}.mp3`,
    title: name,
    artist: 'system',
  }));
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks);
  await TrackPlayer.play();
};

export const speakTextSmart = async (input: string): Promise<void> => {
  const chunks = groupAudioFiles(input);
 // await setupPlayer();
  await playSequenceWithSpeedControl(chunks);
};


