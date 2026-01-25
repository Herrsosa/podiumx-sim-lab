/**
 * Sound Manager for Arena
 * Handles all audio playback with volume control, muting, and Web Audio API
 */

type SoundType =
  | 'crowd_roar_small'
  | 'crowd_roar_medium'
  | 'crowd_roar_large'
  | 'crowd_ambient'
  | 'surge_ability'
  | 'bonk_hit'
  | 'lead_change'
  | 'countdown_beep'
  | 'countdown_final'
  | 'race_start'
  | 'station_complete'
  | 'victory_fanfare'
  | 'bet_placed'
  | 'cash_out'
  | 'whoosh'
  | 'impact'
  | 'hype_spike';

interface SoundConfig {
  volume: number; // 0-1
  loop?: boolean;
  fadeIn?: number; // milliseconds
  fadeOut?: number; // milliseconds
}

class SoundManager {
  private context: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private activeSources: Map<string, { source: AudioBufferSourceNode; gainNode: GainNode }> = new Map();
  private masterVolume = 0.7;
  private isMuted = false;

  constructor() {
    // Initialize on first user interaction (browser requirement)
    if (typeof window !== 'undefined') {
      document.addEventListener('click', () => this.init(), { once: true });
    }
  }

  private init() {
    if (this.context) return;
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType, config: Partial<SoundConfig> = {}): string | null {
    if (!this.context || this.isMuted) return null;

    const defaults: SoundConfig = {
      volume: 1,
      loop: false,
      fadeIn: 0,
      fadeOut: 0,
    };

    const settings = { ...defaults, ...config };
    const id = `${type}-${Date.now()}-${Math.random()}`;

    // For now, use synthesized sounds until we have audio assets
    this.playSynthesized(type, id, settings);

    return id;
  }

  /**
   * Generate synthesized sounds using Web Audio API
   */
  private playSynthesized(type: SoundType, id: string, config: SoundConfig) {
    if (!this.context) return;

    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const now = ctx.currentTime;

    // Configure sound based on type
    switch (type) {
      case 'crowd_roar_small':
        this.createCrowdRoar(oscillator, gainNode, 0.3);
        break;
      case 'crowd_roar_medium':
        this.createCrowdRoar(oscillator, gainNode, 0.6);
        break;
      case 'crowd_roar_large':
        this.createCrowdRoar(oscillator, gainNode, 1.0);
        break;
      case 'surge_ability':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        gainNode.gain.setValueAtTime(0.4 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        break;
      case 'bonk_hit':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(100, now);
        oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gainNode.gain.setValueAtTime(0.5 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'lead_change':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.setValueAtTime(554, now + 0.1);
        oscillator.frequency.setValueAtTime(659, now + 0.2);
        gainNode.gain.setValueAtTime(0.3 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        break;
      case 'countdown_beep':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.2 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        break;
      case 'countdown_final':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, now);
        gainNode.gain.setValueAtTime(0.3 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'race_start':
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.3);
        gainNode.gain.setValueAtTime(0.4 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        break;
      case 'whoosh':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gainNode.gain.setValueAtTime(0.2 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        break;
      case 'impact':
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(80, now);
        oscillator.frequency.exponentialRampToValueAtTime(20, now + 0.1);
        gainNode.gain.setValueAtTime(0.4 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        break;
      case 'hype_spike':
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gainNode.gain.setValueAtTime(0.3 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        break;
      default:
        // Generic beep
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.2 * config.volume * this.masterVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    }

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 1); // Max 1 second for sound effects

    oscillator.onended = () => {
      this.activeSources.delete(id);
    };
  }

  /**
   * Create crowd roar using white noise
   */
  private createCrowdRoar(oscillator: OscillatorNode, gainNode: GainNode, intensity: number) {
    if (!this.context) return;

    const ctx = this.context;
    const now = ctx.currentTime;
    const duration = 1.5 + intensity * 1.5; // Longer roars for more intense moments

    // Use white noise instead of oscillator for crowd sound
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * intensity;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000 + intensity * 500, now);
    filter.Q.setValueAtTime(0.5, now);

    const volume = 0.15 * intensity * this.masterVolume;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.1);
    gainNode.gain.setValueAtTime(volume, now + duration - 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  /**
   * Play ambient crowd murmur (looping)
   */
  playAmbient(): string | null {
    return this.play('crowd_ambient', { volume: 0.15, loop: true });
  }

  /**
   * Stop a specific sound
   */
  stop(id: string) {
    const sound = this.activeSources.get(id);
    if (sound) {
      try {
        sound.source.stop();
        this.activeSources.delete(id);
      } catch (e) {
        // Already stopped
      }
    }
  }

  /**
   * Stop all sounds
   */
  stopAll() {
    this.activeSources.forEach((_, id) => this.stop(id));
  }

  /**
   * Set master volume (0-1)
   */
  setVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Mute/unmute all sounds
   */
  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  /**
   * Get muted state
   */
  getMuted(): boolean {
    return this.isMuted;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playCrowdRoar = (intensity: 'small' | 'medium' | 'large' = 'medium') => {
  soundManager.play(`crowd_roar_${intensity}`);
};

export const playSurge = () => soundManager.play('surge_ability');
export const playBonk = () => soundManager.play('bonk_hit');
export const playLeadChange = () => soundManager.play('lead_change');
export const playCountdownBeep = () => soundManager.play('countdown_beep');
export const playCountdownFinal = () => soundManager.play('countdown_final');
export const playRaceStart = () => soundManager.play('race_start');
export const playWhoosh = () => soundManager.play('whoosh');
export const playImpact = () => soundManager.play('impact');
export const playHypeSpike = () => soundManager.play('hype_spike');
