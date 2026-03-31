/**
 * NovaStar Audio Engine
 * Synthesized sound effects + music system
 * No external audio files needed — everything is generated
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this._initialized = false;
    this._sounds = new Map();

    // Register built-in sounds
    this._registerBuiltins();
  }

  init() {
    if (this._initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.masterGain);

    this._initialized = true;
  }

  // ─── VOLUME CONTROLS ───────────────────────────
  setMasterVolume(v) { if (this.masterGain) this.masterGain.gain.value = v; }
  setSFXVolume(v)    { if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusicVolume(v)  { if (this.musicGain) this.musicGain.gain.value = v; }

  // ─── SOUND REGISTRATION ────────────────────────
  registerSound(name, generator) {
    this._sounds.set(name, generator);
  }

  _registerBuiltins() {
    this.registerSound('jump', (ctx, dest) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.type = 'square';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      filter.type = 'lowpass'; filter.frequency.value = 2000;
      osc.start(now); osc.stop(now + 0.2);
    });

    this.registerSound('land', (ctx, dest) => {
      const now = ctx.currentTime;
      // Thump
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(dest);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
      // Noise
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      const ns = ctx.createBufferSource(); ns.buffer = buf;
      const ng = ctx.createGain(); ng.gain.value = 0.08;
      ns.connect(ng); ng.connect(dest); ns.start(now);
    });

    this.registerSound('collect', (ctx, dest) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(dest);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.08);
      osc.frequency.setValueAtTime(1320, now + 0.16);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
      // Shimmer
      const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(dest);
      o2.type = 'sine';
      o2.frequency.setValueAtTime(1760, now + 0.05);
      g2.gain.setValueAtTime(0.05, now + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      o2.start(now + 0.05); o2.stop(now + 0.4);
    });

    this.registerSound('dash', (ctx, dest) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      filter.type = 'lowpass'; filter.frequency.value = 1500;
      osc.start(now); osc.stop(now + 0.22);
    });

    this.registerSound('bounce', (ctx, dest) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(dest);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now); osc.stop(now + 0.35);
    });

    this.registerSound('hurt', (ctx, dest) => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(dest);
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
    });

    this.registerSound('powerup', (ctx, dest) => {
      const now = ctx.currentTime;
      for (let i = 0; i < 5; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest);
        osc.type = 'sine';
        const t = now + i * 0.08;
        osc.frequency.setValueAtTime(440 + i * 220, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
      }
    });

    this.registerSound('step', (ctx, dest) => {
      const now = ctx.currentTime;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6) * 0.3;
      }
      const ns = ctx.createBufferSource(); ns.buffer = buf;
      const ng = ctx.createGain(); ng.gain.value = 0.06;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 600 + Math.random() * 400;
      ns.connect(filter); filter.connect(ng); ng.connect(dest);
      ns.start(now);
    });

    this.registerSound('explosion', (ctx, dest) => {
      const now = ctx.currentTime;
      // Boom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(dest);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
      // Noise
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const ns = ctx.createBufferSource(); ns.buffer = buf;
      const ng = ctx.createGain(); ng.gain.value = 0.15;
      ns.connect(ng); ng.connect(dest); ns.start(now);
    });
  }

  // ─── PLAY SOUNDS ───────────────────────────────
  play(name) {
    if (!this._initialized || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const generator = this._sounds.get(name);
    if (generator) {
      generator(this.ctx, this.sfxGain);
    } else {
      console.warn(`[NovaStar Audio] Unknown sound: "${name}"`);
    }
  }

  // ─── SIMPLE MUSIC SYSTEM ───────────────────────
  playNote(frequency, duration = 0.3, type = 'sine', volume = 0.1) {
    if (!this._initialized) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.musicGain);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now); osc.stop(now + duration);
  }

  /**
   * Play a simple melody from an array of { note, duration } objects
   * note = frequency in Hz (0 = rest)
   */
  playMelody(notes, type = 'sine', volume = 0.08) {
    if (!this._initialized) return;
    let time = this.ctx.currentTime;
    for (const { note, duration } of notes) {
      if (note > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.musicGain);
        osc.type = type;
        osc.frequency.setValueAtTime(note, time);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.setValueAtTime(volume, time + duration * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.start(time); osc.stop(time + duration);
      }
      time += duration;
    }
  }

  // ─── v0.3: AUDIO FILE LOADING ───────────────────
  /**
   * Load an audio file (WAV/MP3/OGG) and register it
   * @param {string} name - Sound name for play() calls
   * @param {string|File|ArrayBuffer} source - URL, File object, or raw ArrayBuffer
   * @returns {Promise<object>} Audio metadata { name, duration, sampleRate }
   */
  async loadFile(name, source) {
    if (!this._initialized) this.init();

    let arrayBuffer;
    if (source instanceof ArrayBuffer) {
      arrayBuffer = source;
    } else if (source instanceof File) {
      arrayBuffer = await source.arrayBuffer();
    } else if (typeof source === 'string') {
      const response = await fetch(source);
      arrayBuffer = await response.arrayBuffer();
    } else {
      throw new Error(`[NovaStar Audio] Invalid source type for "${name}"`);
    }

    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    const meta = {
      name,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };

    // Store decoded buffer
    if (!this._loadedBuffers) this._loadedBuffers = new Map();
    this._loadedBuffers.set(name, audioBuffer);

    // Register as a playable sound
    this.registerSound(name, (ctx, dest) => {
      const src = ctx.createBufferSource();
      src.buffer = this._loadedBuffers.get(name);
      const gain = ctx.createGain();
      gain.gain.value = 1.0;
      src.connect(gain);
      gain.connect(dest);
      src.start();
    });

    console.log(`[NovaStar Audio] Loaded "${name}" (${meta.duration.toFixed(2)}s, ${meta.sampleRate}Hz)`);
    return meta;
  }

  /**
   * Play a loaded audio file with options
   * @param {string} name - Registered sound name
   * @param {object} options - { loop, volume, category, offset, duration }
   * @returns {object|null} Source control { stop(), setVolume() }
   */
  playLoaded(name, options = {}) {
    if (!this._initialized || !this._loadedBuffers) return null;
    const buffer = this._loadedBuffers.get(name);
    if (!buffer) { console.warn(`[NovaStar Audio] No loaded buffer: "${name}"`); return null; }

    if (this.ctx.state === 'suspended') this.ctx.resume();

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = options.loop || false;

    const gain = this.ctx.createGain();
    gain.gain.value = options.volume !== undefined ? options.volume : 1.0;

    const dest = options.category === 'music' ? this.musicGain : this.sfxGain;
    src.connect(gain);
    gain.connect(dest);

    src.start(0, options.offset || 0, options.duration);

    return {
      source: src,
      gainNode: gain,
      stop: () => { try { src.stop(); } catch {} },
      setVolume: (v) => { gain.gain.value = v; },
    };
  }

  /**
   * Play audio with 3D spatial positioning
   * @param {string} name - Sound name
   * @param {object} options - { position, maxDistance, rolloff, loop, volume }
   */
  playSpatial(name, options = {}) {
    if (!this._initialized || !this._loadedBuffers) return null;
    const buffer = this._loadedBuffers.get(name);
    if (!buffer) return null;

    if (this.ctx.state === 'suspended') this.ctx.resume();

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = options.loop || false;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = options.maxDistance || 50;
    panner.rolloffFactor = options.rolloff || 1;

    if (options.position) {
      panner.positionX.value = options.position.x || 0;
      panner.positionY.value = options.position.y || 0;
      panner.positionZ.value = options.position.z || 0;
    }

    const gain = this.ctx.createGain();
    gain.gain.value = options.volume !== undefined ? options.volume : 1.0;

    src.connect(panner);
    panner.connect(gain);
    gain.connect(this.sfxGain);
    src.start();

    return {
      source: src, panner, gainNode: gain,
      stop: () => { try { src.stop(); } catch {} },
      setPosition: (x, y, z) => {
        panner.positionX.value = x;
        panner.positionY.value = y;
        panner.positionZ.value = z;
      },
    };
  }

  /**
   * Get list of all loaded audio files
   */
  getLoadedFiles() {
    if (!this._loadedBuffers) return [];
    return [...this._loadedBuffers.entries()].map(([name, buf]) => ({
      name,
      duration: buf.duration,
      sampleRate: buf.sampleRate,
      channels: buf.numberOfChannels,
    }));
  }
}
