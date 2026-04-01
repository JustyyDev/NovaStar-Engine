/**
 * NovaStar Weather & Day/Night System v0.4
 * Dynamic weather effects, time-of-day lighting, and environment moods
 *
 * Usage:
 *   const weather = new WeatherSystem(engine);
 *   weather.setTimeOfDay(14.5); // 2:30 PM
 *   weather.setWeather('rain');
 *   weather.enableDayNightCycle(60); // full cycle in 60 seconds
 */

import * as THREE from 'three';

export class WeatherSystem {
  constructor(engine) {
    this.engine = engine;
    this.timeOfDay = 12; // 0-24, noon default
    this.weather = 'clear'; // clear, cloudy, rain, snow, fog, storm
    this.dayNightEnabled = false;
    this.cycleDuration = 300; // seconds per full day
    this._elapsed = 0;
    this._particles = null;
    this._onChange = [];

    this.presets = {
      clear:  { skyTop: '#4a9eff', skyBottom: '#87ceeb', fogDensity: 0, ambient: 0.6 },
      cloudy: { skyTop: '#7a8ea0', skyBottom: '#b0b8c0', fogDensity: 0.01, ambient: 0.4 },
      rain:   { skyTop: '#4a5568', skyBottom: '#6b7280', fogDensity: 0.02, ambient: 0.3, particles: 'rain' },
      snow:   { skyTop: '#c8d6e5', skyBottom: '#dfe6ed', fogDensity: 0.015, ambient: 0.5, particles: 'snow' },
      fog:    { skyTop: '#9ca3af', skyBottom: '#d1d5db', fogDensity: 0.05, ambient: 0.35 },
      storm:  { skyTop: '#1f2937', skyBottom: '#374151', fogDensity: 0.03, ambient: 0.2, particles: 'rain' },
    };
  }

  setTimeOfDay(hour) {
    this.timeOfDay = ((hour % 24) + 24) % 24;
    this._applyTimeOfDay();
  }

  setWeather(type) {
    if (!this.presets[type]) { console.warn('[Weather] Unknown type:', type); return; }
    this.weather = type;
    this._applyWeather();
    this._onChange.forEach(fn => fn({ weather: type, time: this.timeOfDay }));
  }

  enableDayNightCycle(cycleDurationSeconds = 300) {
    this.cycleDuration = cycleDurationSeconds;
    this.dayNightEnabled = true;
    this._elapsed = (this.timeOfDay / 24) * cycleDurationSeconds;
  }

  disableDayNightCycle() {
    this.dayNightEnabled = false;
  }

  update(dt) {
    if (!this.dayNightEnabled) return;
    this._elapsed += dt;
    this.timeOfDay = (this._elapsed / this.cycleDuration * 24) % 24;
    this._applyTimeOfDay();
  }

  _applyTimeOfDay() {
    const t = this.timeOfDay;
    let sunIntensity, ambientIntensity;
    let skyTopColor, skyBottomColor;

    if (t >= 6 && t < 8) {
      // Sunrise
      const f = (t - 6) / 2;
      sunIntensity = f * 0.8;
      ambientIntensity = 0.2 + f * 0.4;
      skyTopColor = this._lerpColor('#1a1a3e', '#ff8c42', f);
      skyBottomColor = this._lerpColor('#0a0a1e', '#ffb366', f);
    } else if (t >= 8 && t < 17) {
      // Daytime
      sunIntensity = 0.8;
      ambientIntensity = 0.6;
      skyTopColor = '#4a9eff';
      skyBottomColor = '#87ceeb';
    } else if (t >= 17 && t < 20) {
      // Sunset
      const f = (t - 17) / 3;
      sunIntensity = 0.8 - f * 0.6;
      ambientIntensity = 0.6 - f * 0.4;
      skyTopColor = this._lerpColor('#4a9eff', '#2d1b69', f);
      skyBottomColor = this._lerpColor('#87ceeb', '#ff6b35', f);
    } else {
      // Night
      sunIntensity = 0.05;
      ambientIntensity = 0.15;
      skyTopColor = '#0a0a2e';
      skyBottomColor = '#1a1a3e';
    }

    try {
      this.engine.renderer.setSkyColor(
        parseInt(skyTopColor.replace('#', ''), 16),
        parseInt(skyBottomColor.replace('#', ''), 16)
      );
    } catch {}
  }

  _applyWeather() {
    const preset = this.presets[this.weather];
    if (!preset) return;
    if (preset.fogDensity > 0) {
      try {
        const fogColor = parseInt(preset.skyBottom.replace('#', ''), 16);
        this.engine.scene.fog = new THREE.FogExp2(fogColor, preset.fogDensity);
      } catch {}
    } else {
      this.engine.scene.fog = null;
    }
  }

  _lerpColor(a, b, t) {
    const parse = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const [r1,g1,b1] = parse(a);
    const [r2,g2,b2] = parse(b);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const bl = Math.round(b1 + (b2-b1)*t);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
  }

  get isDay() { return this.timeOfDay >= 6 && this.timeOfDay < 20; }
  get isNight() { return !this.isDay; }
  get isDawn() { return this.timeOfDay >= 5 && this.timeOfDay < 8; }
  get isDusk() { return this.timeOfDay >= 17 && this.timeOfDay < 20; }

  onChange(fn) { this._onChange.push(fn); }
}
