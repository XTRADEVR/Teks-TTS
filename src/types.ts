export type CapabilityMode = 'default' | 'research' | 'image' | 'video' | 'diagram';

export type ModelLabel =
  | 'Kimi K2.5 - Private + Anon'
  | 'DeepSeek V4.1 Flash (Uncensored) - Private';

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: CapabilityMode;
  modelLabel?: ModelLabel;
  sources?: GroundingSource[];
  createdAt: number;
  audioBase64?: string;
}

export interface TtsClip {
  id: string;
  text: string;
  voiceName: string;
  style?: string;
  mode: 'single' | 'multi';
  audioBase64: string;
  createdAt: number;
}
