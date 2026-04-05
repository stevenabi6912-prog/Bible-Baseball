// ============================================================
// Sound Manager — Howler.js wrapper
// ============================================================

import { Howl } from 'howler';

export type SoundName =
  | 'background'
  | 'correct'
  | 'wrong'
  | 'homerun'
  | 'advance'
  | 'gameOverWin'
  | 'gameOverLose';

interface SoundConfig {
  file: string;
  loop?: boolean;
  volume?: number;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  background: { file: 'organ-loop.mp3', loop: true, volume: 0.3 },
  correct: { file: 'crowd-cheer.mp3', volume: 0.6 },
  wrong: { file: 'crowd-groan.mp3', volume: 0.5 },
  homerun: { file: 'homerun-fanfare.mp3', volume: 0.7 },
  advance: { file: 'crowd-react.mp3', volume: 0.4 },
  gameOverWin: { file: 'victory-jingle.mp3', volume: 0.6 },
  gameOverLose: { file: 'defeat-jingle.mp3', volume: 0.5 },
};

class SoundManager {
  private sounds: Map<SoundName, Howl> = new Map();
  private _muted = false;
  private initialized = false;

  /**
   * Initialize all sounds. Call once after first user interaction.
   * Detects the base path at runtime from the current page URL
   * so it works on both localhost and GitHub Pages.
   */
  init() {
    if (this.initialized) return;

    // Detect base path from the current URL at runtime
    // On GitHub Pages: /Bible-Baseball/  →  basePath = "/Bible-Baseball"
    // On localhost:    /                 →  basePath = ""
    let basePath = '';
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      // If the path starts with /Bible-Baseball, use that as base
      if (path.startsWith('/Bible-Baseball')) {
        basePath = '/Bible-Baseball';
      }
    }

    for (const [name, config] of Object.entries(SOUND_CONFIG)) {
      const src = `${basePath}/sounds/${config.file}`;
      const howl = new Howl({
        src: [src],
        loop: config.loop ?? false,
        volume: config.volume ?? 0.5,
        preload: true,
        onloaderror: () => {
          console.warn(`Sound file not found: ${src} — using silent fallback`);
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
    this.sounds.forEach((sound) => sound.mute(this._muted));
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
