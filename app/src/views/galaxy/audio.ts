/**
 * The sound of a light coming on.
 *
 * Synthesised rather than sampled, which is the spec's recommendation and worth
 * restating: the failure mode of a juicy interface is the tenth trigger, not the
 * first. A sampled thump is identical every time and the ear stops hearing it
 * within a minute; a synthesised one can be detuned a few percent per event, and
 * fifty ignitions in a row still land. It also keeps the bundle at zero added
 * bytes and avoids licensing an asset for a prototype.
 *
 * Two required sounds, from the spec's section 5:
 *
 *   - **Ignition.** A stadium light striking on. Low-end thump plus a bright
 *     bloom of high frequency: a sine dropping roughly 96 Hz to 38 Hz in a fifth
 *     of a second, layered with a band-passed noise burst sweeping down from the
 *     top of the spectrum, both fed to a short reverb so the room floods.
 *   - **Entry sweep.** A rising "loading up" tone — a detuned saw pair under a
 *     resonant filter opening from 180 Hz to 5 kHz across the sweep.
 *
 * Everything hangs off one `AudioContext` created on a user gesture, because
 * browsers will not allow otherwise. Until `unlock()` is called this object is a
 * working no-op: every method may be called safely and does nothing, so no caller
 * needs to know whether audio exists yet.
 */

const STORAGE_KEY = 'supernova.galaxy.muted'

export function readStoredMute(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // Storage can be denied outright (Safari private browsing, a locked-down
    // district image). A muted-by-default fallback would be worse than an
    // unmuted one that the toggle still controls for this session.
    return false
  }
}

function storeMute(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(muted))
  } catch {
    /* Not being able to remember the preference is not a reason to fail setting it. */
  }
}

export interface IgniteOptions {
  /** 0 to 1. Scales loudness and the reverb send — a cascade step is quieter than a click. */
  power?: number
  /** Multiplies every frequency. Above 1 for a smaller body, below for a larger one. */
  pitch?: number
}

export class GalaxyAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private muted: boolean = readStoredMute()

  get isMuted(): boolean {
    return this.muted
  }

  /** Whether audio has been started. The UI says so, rather than silently failing. */
  get isReady(): boolean {
    return this.ctx !== null
  }

  /**
   * Must be called from inside a user gesture. Safe to call repeatedly — a second
   * call only resumes a context the browser suspended when the tab went to sleep.
   */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return

    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.9
    master.connect(ctx.destination)

    const reverb = ctx.createConvolver()
    reverb.buffer = impulseResponse(ctx, 1.5, 2.6)
    const reverbLevel = ctx.createGain()
    reverbLevel.gain.value = 0.9
    reverb.connect(reverbLevel)
    reverbLevel.connect(master)

    this.ctx = ctx
    this.master = master
    this.reverb = reverb
    void ctx.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    storeMute(muted)
    if (!this.ctx || !this.master) return
    // Ramped rather than set, because a gain that jumps to zero mid-tail clicks,
    // and a click is the one sound this view must never make.
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.9, now + 0.08)
  }

  close(): void {
    void this.ctx?.close()
    this.ctx = null
    this.master = null
    this.reverb = null
  }

  /** The stadium light. */
  ignite(options: IgniteOptions = {}): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted) return

    const power = clamp(options.power ?? 1, 0, 1)
    // Per-event detune. Small enough to read as the same fixture, wide enough
    // that the ear does not file it as a loop.
    const pitch = (options.pitch ?? 1) * (0.94 + Math.random() * 0.15)
    const t = ctx.currentTime + 0.001

    const bus = ctx.createGain()
    bus.gain.value = power
    bus.connect(master)
    if (this.reverb) {
      const send = ctx.createGain()
      send.gain.value = 0.3 * power
      bus.connect(send)
      send.connect(this.reverb)
    }

    // The thump: the fixture's ballast taking the load.
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(96 * pitch, t)
    sub.frequency.exponentialRampToValueAtTime(38 * pitch, t + 0.24)
    const subGain = ctx.createGain()
    ramp(subGain.gain, t, 0.95, 0.008, 0.62)
    sub.connect(subGain).connect(bus)
    sub.start(t)
    sub.stop(t + 0.7)

    // A triangle an octave up, so the thump survives a laptop speaker with no
    // bottom end at all — which is most of the speakers this will play on.
    const body = ctx.createOscillator()
    body.type = 'triangle'
    body.frequency.setValueAtTime(196 * pitch, t)
    body.frequency.exponentialRampToValueAtTime(74 * pitch, t + 0.2)
    const bodyGain = ctx.createGain()
    ramp(bodyGain.gain, t, 0.3, 0.006, 0.34)
    body.connect(bodyGain).connect(bus)
    body.start(t)
    body.stop(t + 0.4)

    // The bloom: the filament flaring and the room filling.
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer(ctx, 0.9)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.9
    band.frequency.setValueAtTime(6600 * pitch, t)
    band.frequency.exponentialRampToValueAtTime(620 * pitch, t + 0.5)
    const noiseGain = ctx.createGain()
    ramp(noiseGain.gain, t, 0.42, 0.004, 0.58)
    noise.connect(band).connect(noiseGain).connect(bus)
    noise.start(t)
    noise.stop(t + 0.7)

    // A short strike on top — the physical clack of the contactor closing.
    const strike = ctx.createBufferSource()
    strike.buffer = noiseBuffer(ctx, 0.08)
    const high = ctx.createBiquadFilter()
    high.type = 'highpass'
    high.frequency.value = 3200
    const strikeGain = ctx.createGain()
    ramp(strikeGain.gain, t, 0.22, 0.002, 0.07)
    strike.connect(high).connect(strikeGain).connect(bus)
    strike.start(t)
    strike.stop(t + 0.1)
  }

  /**
   * The entry sweep: a rise that resolves when the current grade lands. Returns
   * nothing — the caller owns the timing, and fires an `ignite` at the end if it
   * wants the arrival to land as an impact.
   */
  sweep(duration: number): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted) return

    const t = ctx.currentTime + 0.001
    const end = t + duration

    const bus = ctx.createGain()
    bus.gain.value = 0.5
    bus.connect(master)
    if (this.reverb) {
      const send = ctx.createGain()
      send.gain.value = 0.25
      bus.connect(send)
      send.connect(this.reverb)
    }

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 6
    filter.frequency.setValueAtTime(180, t)
    filter.frequency.exponentialRampToValueAtTime(5200, end)
    filter.connect(bus)

    const level = ctx.createGain()
    level.gain.setValueAtTime(0.0001, t)
    level.gain.exponentialRampToValueAtTime(0.34, t + duration * 0.72)
    level.gain.exponentialRampToValueAtTime(0.0001, end + 0.3)
    level.connect(filter)

    // Two saws a few cents apart. The beating between them is what makes a rise
    // sound like it is gathering rather than merely getting higher.
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.detune.value = detune
      osc.frequency.setValueAtTime(46, t)
      osc.frequency.exponentialRampToValueAtTime(140, end)
      osc.connect(level)
      osc.start(t)
      osc.stop(end + 0.4)
    }

    // A sine gliding two and a half octaves over the top, carrying the "loading"
    // read that the saws alone are too dense to give.
    const glide = ctx.createOscillator()
    glide.type = 'sine'
    glide.frequency.setValueAtTime(220, t)
    glide.frequency.exponentialRampToValueAtTime(1320, end)
    const glideGain = ctx.createGain()
    glideGain.gain.setValueAtTime(0.0001, t)
    glideGain.gain.exponentialRampToValueAtTime(0.11, end - 0.1)
    glideGain.gain.exponentialRampToValueAtTime(0.0001, end + 0.25)
    glide.connect(glideGain).connect(bus)
    glide.start(t)
    glide.stop(end + 0.3)
  }

  /** A light going off. Used by Unmaster and by Reset. */
  extinguish(power = 1): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted) return

    const t = ctx.currentTime + 0.001
    const bus = ctx.createGain()
    bus.gain.value = clamp(power, 0, 1) * 0.7
    bus.connect(master)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.34)
    const oscGain = ctx.createGain()
    ramp(oscGain.gain, t, 0.4, 0.01, 0.4)
    osc.connect(oscGain).connect(bus)
    osc.start(t)
    osc.stop(t + 0.5)

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer(ctx, 0.4)
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.setValueAtTime(2400, t)
    low.frequency.exponentialRampToValueAtTime(280, t + 0.32)
    const noiseGain = ctx.createGain()
    ramp(noiseGain.gain, t, 0.16, 0.006, 0.34)
    noise.connect(low).connect(noiseGain).connect(bus)
    noise.start(t)
    noise.stop(t + 0.45)
  }

  /** Navigation. Quiet, short, and pitched by depth so the three levels sound different. */
  tick(pitch = 1): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.muted) return

    const t = ctx.currentTime + 0.001
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520 * pitch, t)
    osc.frequency.exponentialRampToValueAtTime(760 * pitch, t + 0.06)
    const gain = ctx.createGain()
    ramp(gain.gain, t, 0.07, 0.004, 0.09)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + 0.14)
  }
}

// --- Primitives ---------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Attack and decay in one call.
 *
 * Exponential throughout, and never to literal zero: `exponentialRampToValueAtTime`
 * throws on a non-positive target, and a linear decay on a percussive envelope
 * sounds like a gate closing rather than a sound ending.
 */
function ramp(param: AudioParam, t: number, peak: number, attack: number, decay: number): void {
  param.setValueAtTime(0.0001, t)
  param.exponentialRampToValueAtTime(peak, t + attack)
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

/**
 * A room, as decaying noise. Stereo, with the two channels independent so the
 * tail spreads instead of sitting in the middle of the head.
 */
function impulseResponse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return buffer
}
