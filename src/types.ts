export type VisualStyle = 'trap' | 'romantic' | 'motivational' | 'anime' | 'minimalist';

export interface Scene {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  visualPrompt: string;
  imageUrl: string | null;
  emotion: string;
  keywords: string[];
}

export interface VideoProject {
  id: string;
  title: string;
  lyrics: string;
  audioUrl: string | null;
  style: VisualStyle;
  scenes: Scene[];
  bpm: number;
}
