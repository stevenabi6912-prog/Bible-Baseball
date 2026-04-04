// ============================================================
// Sound Manager — Howler.js wrapper
// ============================================================

import { Howl } from 'howler';

/** Get the base path for assets (matches next.config.ts basePath) */
const BASE_PATH = process.env.NODE_ENV === 'production' ? '/Bible-Baseball' : '';

export type SoundName =
  | 'background'
  | 'correct'
  | 'wrong'
  | 'homerun'
  | 'advance'
  | 'gameOverWin'
  | 'gameOverLose';

interface SoundConfig {
  src: string[];
  loop?: boolean;
  volume?: number;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  background: {
    src: [BASE_PATH + '/sounds/organ-loop.mp3'],
    loop: true,
    volume: 0.3,
  },
  correct: {
    src: [BASE_PATH + '/sounds/crowd-cheer.mp3'],
    volume: 0.6,
  },
  wrong: {
    src: [BASE_PATH + '/sounds/crowd-groan.mp3'],
    volume: 0.5,
  },
  homerun: {
    src: [BASE_PATH + '/sounds/homerun-fanfare.mp3'],
    volume: 0.7,
  },
  advance: {
    src: [BASE_PATH + '/sounds/crowd-react.mp3'],
    volume: 0.4,
  },
  gameOverWin: {
    src: [BASE_PATH + '/sounds/victory-jingle.mp3'],
    volume: 0.6,
  },
  gameOverLose: {
    src: [BASE_PATH + '/sounds/defeat-jingle.mp3'],
    volume: 0.5,
  },
};

class SoundManager {
  private sounds: Map<SoundName, Howl> = new Map();
  private _muted = false;
  private initialized = false;

  /** Initialize all sounds. Call once after first user interaction. */
  init() {
    if (this.initialized) return;

    for (const [name, config] of Object.entries(SOUND_CONFIG)) {
      const howl = new Howl({
        src: config.src,
        loop: config.loop ?? false,
        volume: config.volume ?? 0.5,
        preload: true,
        // Silently handle missing placeholder files
        onloaderror: () => {
          console.warn(`Sound file not found: ${config.src[0]} — using silent fallback`);
        },
      });
      this.sounds.set(name as SoundName, howl);
    }

    this.initialized = true;
  }

  /** Play a sound by name */
  play(name: SoundName) {
    if (this._muted) return;
    const sound = this.sounds.get(name);
    if (sound) {
      sound.play();
    }
  }

  /** Stop a specific sound */
  stop(name: SoundName) {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.stop();
    }
  }

  /** Stop all sounds */
  stopAll() {
    this.sounds.forEach((sound) => sound.stop());
  }

  /** Toggle mute state */
  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this._muted) {
      this.sounds.forEach((sound) => sound.mute(true));
    } else {
      this.sounds.forEach((sound) => sound.mute(false));
    }
    return this._muted;
  }

  /** Get current mute state */
  get muted(): boolean {
    return this._muted;
  }

  /** Set mute state directly */
  setMuted(muted: boolean) {
    this._muted = muted;
    this.sounds.forEach((sound) => sound.mute(muted));
  }
}

// Singleton instance
export const soundManager = new SoundManager();
