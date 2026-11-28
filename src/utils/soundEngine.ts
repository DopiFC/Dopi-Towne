/**
 * Pure Web Audio API Sound Engine for DOPI TOWNE.
 * Zero external .mp3/.wav files — 100% static GitHub Pages compatible.
 */

const BGM_STORAGE_KEY = 'dopi_towne_bgm_enabled';
const SFX_STORAGE_KEY = 'dopi_towne_sfx_enabled';

// Cozy pentatonic farm melody (C major pentatonic: C5, D5, E5, G5, A5, C6)
const BGM_MELODY_HZ = [
  523.25, 659.25, 587.33, 783.99,
  659.25, 523.25, 440.00, 523.25,
  587.33, 659.25, 783.99, 880.00,
  783.99, 659.25, 587.33, 523.25,
];

const BGM_BASS_HZ = [
  261.63, 261.63, 196.00, 196.00,
  220.00, 220.00, 174.61, 196.00,
  261.63, 261.63, 220.00, 220.00,
  174.61, 196.00, 261.63, 261.63,
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private bgmTimer: number | null = null;
  private stepIdx = 0;
  private unlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedBgm = window.localStorage.getItem(BGM_STORAGE_KEY);
        const savedSfx = window.localStorage.getItem(SFX_STORAGE_KEY);
        if (savedBgm !== null) this.bgmEnabled = savedBgm === 'true';
        if (savedSfx !== null) this.sfxEnabled = savedSfx === 'true';
      } catch {
        // ignore storage errors
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stopBgmLoop();
          } else if (this.unlocked && this.bgmEnabled) {
            this.startBgmLoop();
          }
        });
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlockAndAutoStart(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    const ctx = this.ensureContext();
    if (ctx && this.bgmEnabled) {
      this.startBgmLoop();
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    try {
      window.localStorage.setItem(BGM_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
    if (enabled) {
      this.ensureContext();
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    try {
      window.localStorage.setItem(SFX_STORAGE_KEY, String(enabled));
    } catch {
      // ignore
    }
    if (enabled) {
      this.playClick();
    }
  }

  private startBgmLoop(): void {
    if (this.bgmTimer !== null || !this.bgmEnabled) return;
    const playStep = () => {
      if (!this.bgmEnabled || (typeof document !== 'undefined' && document.hidden)) {
        this.stopBgmLoop();
        return;
      }
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const melodyFreq = BGM_MELODY_HZ[this.stepIdx % BGM_MELODY_HZ.length];
      const bassFreq = BGM_BASS_HZ[this.stepIdx % BGM_BASS_HZ.length];

      // Soft warm plucked melody
      this.scheduleTone(ctx, melodyFreq, now, 0.34, 'triangle', 0.035);
      // Gentle bass accompaniment every 2 beats
      if (this.stepIdx % 2 === 0) {
        this.scheduleTone(ctx, bassFreq, now, 0.55, 'sine', 0.025);
      }
      this.stepIdx = (this.stepIdx + 1) % BGM_MELODY_HZ.length;
    };

    playStep();
    this.bgmTimer = window.setInterval(playStep, 520);
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // ignore already disconnected nodes
      }
    };
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  public playClick(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.scheduleTone(ctx, 540, now, 0.055, 'sine', 0.07);
  }

  public playPlant(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.scheduleTone(ctx, 320, now, 0.07, 'triangle', 0.09);
    this.scheduleTone(ctx, 440, now + 0.055, 0.09, 'sine', 0.08);
  }

  public playHarvest(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.scheduleTone(ctx, 523.25, now, 0.08, 'triangle', 0.09);
    this.scheduleTone(ctx, 659.25, now + 0.06, 0.09, 'triangle', 0.09);
    this.scheduleTone(ctx, 783.99, now + 0.12, 0.14, 'sine', 0.1);
  }

  public playCoin(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.scheduleTone(ctx, 987.77, now, 0.09, 'sine', 0.09);
    this.scheduleTone(ctx, 1318.51, now + 0.075, 0.18, 'sine', 0.1);
  }

  public playOrder(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.scheduleTone(ctx, 440, now, 0.09, 'triangle', 0.09);
    this.scheduleTone(ctx, 554.37, now + 0.07, 0.09, 'triangle', 0.09);
    this.scheduleTone(ctx, 659.25, now + 0.14, 0.12, 'triangle', 0.1);
    this.scheduleTone(ctx, 880, now + 0.21, 0.22, 'sine', 0.11);
  }

  public playFanfare(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.scheduleTone(ctx, n, now + idx * 0.09, idx === 3 ? 0.35 : 0.12, 'triangle', 0.11);
    });
  }

  public playError(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.scheduleTone(ctx, 220, now, 0.12, 'sawtooth', 0.05);
    this.scheduleTone(ctx, 185, now + 0.1, 0.16, 'sawtooth', 0.05);
  }
}

export const soundEngine = new SoundEngine();
