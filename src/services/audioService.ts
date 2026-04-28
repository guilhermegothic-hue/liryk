import { analyze } from 'web-audio-beat-detector';

export class AudioService {
  private audioCtx: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  async analyzeBpm(file: File): Promise<number> {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const bpm = await analyze(audioBuffer);
    return bpm;
  }

  setupAnalyzer(audioBuffer: AudioBuffer) {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyzer = this.audioCtx.createAnalyser();
    this.analyzer.fftSize = 256;
    
    this.source = this.audioCtx.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(this.analyzer);
    this.analyzer.connect(this.audioCtx.destination);
    
    const bufferLength = this.analyzer.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    
    return { analyzer: this.analyzer, dataArray: this.dataArray, audioCtx: this.audioCtx, source: this.source };
  }

  getByteFrequencyData(): number {
    if (!this.analyzer || !this.dataArray) return 0;
    this.analyzer.getByteFrequencyData(this.dataArray);
    
    // Get average of low frequencies (bass)
    let sum = 0;
    const bassRange = 10; 
    for (let i = 0; i < bassRange; i++) {
      sum += this.dataArray[i];
    }
    return sum / bassRange;
  }
}

export const audioService = new AudioService();
