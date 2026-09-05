type Sound =
  "laser" | "explosion" | "hit" | "pickup" | "boost" | "ui" | "win" | "death";

/** Small, asset-free synth. Call start from a click/key gesture before using it. */
export class AudioSystem {
  enabled = true;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private lastPlayed = new Map<Sound, number>();

  start(): void {
    if (!this.context) {
      const Constructor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Constructor) return;
      try {
        const ctx = new Constructor();
        this.context = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.enabled ? 0.42 : 0;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -15;
        limiter.knee.value = 15;
        limiter.ratio.value = 5;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.18;
        this.master.connect(limiter);
        limiter.connect(ctx.destination);
        this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const samples = this.noise.getChannelData(0);
        let smoothed = 0;
        for (let i = 0; i < samples.length; i++) {
          smoothed = (smoothed + (Math.random() * 2 - 1) * 0.13) / 1.13;
          samples[i] = smoothed * 3;
        }
        this.engineOsc = ctx.createOscillator();
        this.engineOsc.type = "triangle";
        this.engineOsc.frequency.value = 46;
        this.engineGain = ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
      } catch {
        this.context = null;
        return;
      }
    }
    if (this.context.state === "suspended")
      void this.context.resume().catch(() => {});
  }

  setMuted(muted: boolean): void {
    this.enabled = !muted;
    if (!this.context || !this.master) return;
    this.master.gain.setTargetAtTime(
      muted ? 0 : 0.42,
      this.context.currentTime,
      0.035,
    );
  }

  engine(speed: number, active: boolean): void {
    if (!this.context || !this.engineOsc || !this.engineGain) return;
    const normalized = Number.isFinite(speed)
      ? Math.min(1, Math.max(0, speed))
      : 0;
    const now = this.context.currentTime;
    this.engineOsc.frequency.setTargetAtTime(42 + normalized * 55, now, 0.12);
    this.engineGain.gain.setTargetAtTime(
      active && this.enabled ? 0.022 + normalized * 0.025 : 0,
      now,
      0.12,
    );
  }

  play(type: Sound): void {
    if (
      !this.enabled ||
      !this.context ||
      this.context.state !== "running" ||
      !this.master
    )
      return;
    const now = this.context.currentTime;
    const interval: Record<Sound, number> = {
      laser: 0.065,
      explosion: 0.09,
      hit: 0.1,
      pickup: 0.045,
      boost: 0.45,
      ui: 0.06,
      win: 1.5,
      death: 0.7,
    };
    if (now - (this.lastPlayed.get(type) ?? -100) < interval[type]) return;
    this.lastPlayed.set(type, now);
    switch (type) {
      case "laser":
        this.tone(now, 0.11, 860, 180, 0.115, "sawtooth");
        this.tone(now, 0.08, 1500, 460, 0.05, "sine");
        break;
      case "explosion":
        this.hiss(now, 0.55, 0.55, 1100, 70);
        this.tone(now, 0.36, 115, 29, 0.3, "sine");
        break;
      case "hit":
        this.hiss(now, 0.16, 0.3, 2200, 260);
        this.tone(now, 0.15, 200, 58, 0.16, "triangle");
        break;
      case "pickup":
        this.tone(now, 0.13, 740, 880, 0.12, "sine");
        this.tone(now + 0.065, 0.22, 1110, 1480, 0.1, "sine");
        break;
      case "boost":
        this.hiss(now, 0.55, 0.2, 180, 2200);
        this.tone(now, 0.42, 75, 225, 0.09, "triangle");
        break;
      case "ui":
        this.tone(now, 0.07, 520, 650, 0.09, "sine");
        break;
      case "win":
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => {
          this.tone(now + i * 0.14, 0.65, frequency, frequency, 0.12, "sine");
          this.tone(
            now + i * 0.14,
            0.45,
            frequency * 2,
            frequency * 2,
            0.025,
            "triangle",
          );
        });
        break;
      case "death":
        this.hiss(now, 1.15, 0.55, 1600, 55);
        this.tone(now, 1, 190, 25, 0.25, "sawtooth");
        this.tone(now + 0.12, 1.05, 120, 22, 0.2, "sine");
        break;
    }
  }

  private envelope(at: number, duration: number, volume: number): GainNode {
    const gain = this.context!.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.gain.linearRampToValueAtTime(0, at + duration + 0.012);
    gain.connect(this.master!);
    return gain;
  }

  private track(
    source: AudioScheduledSourceNode,
    nodes: AudioNode[],
    at: number,
    duration: number,
  ): void {
    // Stop the oldest voice before admitting another, keeping combat audio bounded.
    if (this.voices.size >= 24) {
      const oldest = this.voices.values().next().value as
        AudioScheduledSourceNode | undefined;
      if (oldest) {
        oldest.stop();
        this.voices.delete(oldest);
      }
    }
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(source);
      source.onended = null;
    };
    source.start(at);
    source.stop(at + duration + 0.02);
  }

  private tone(
    at: number,
    duration: number,
    from: number,
    to: number,
    volume: number,
    wave: OscillatorType,
  ): void {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, at);
    oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
    const envelope = this.envelope(at, duration, volume);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    oscillator.connect(filter);
    filter.connect(envelope);
    this.track(oscillator, [filter, envelope], at, duration);
  }

  private hiss(
    at: number,
    duration: number,
    volume: number,
    from: number,
    to: number,
  ): void {
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + duration);
    const envelope = this.envelope(at, duration, volume);
    source.connect(filter);
    filter.connect(envelope);
    this.track(source, [filter, envelope], at, duration);
  }
}
