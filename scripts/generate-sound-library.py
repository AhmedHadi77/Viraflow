"""Original, royalty-free music loops for the Sohba sound library, synthesised from scratch."""
import numpy as np
from scipy.signal import lfilter, fftconvolve, butter, sosfilt
import subprocess, os, json, sys

SR = 44100
DUR = 30.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/music/out"
os.makedirs(OUT, exist_ok=True)

def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)

def env_adsr(length, a=0.01, d=0.1, s=0.7, r=0.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    e = np.ones(n) * s
    an, dn, rn = int(a * SR), int(d * SR), int(r * SR)
    if an > 0:
        e[:an] = np.linspace(0, 1, an)
    if dn > 0:
        e[an:an + dn] = np.linspace(1, s, len(e[an:an + dn]))
    if rn > 0 and rn < n:
        e[-rn:] *= np.linspace(1, 0, rn)
    return e

def osc(kind, freq, length, detune=0.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    if kind == "sine":
        return np.sin(2 * np.pi * f * t)
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    if kind == "saw":
        y = np.zeros(n)
        k = 1
        while k * f < SR / 2.2 and k < 40:
            y += ((-1) ** (k + 1)) * np.sin(2 * np.pi * k * f * t) / k
            k += 1
        return y * 2 / np.pi
    if kind == "square":
        y = np.zeros(n)
        k = 1
        while k * f < SR / 2.2 and k < 40:
            y += np.sin(2 * np.pi * k * f * t) / k
            k += 2
        return y * 4 / np.pi
    raise ValueError(kind)

def lowpass(x, cutoff, order=2):
    sos = butter(order, min(cutoff, SR / 2.1), btype="low", fs=SR, output="sos")
    return sosfilt(sos, x)

def highpass(x, cutoff, order=2):
    sos = butter(order, cutoff, btype="high", fs=SR, output="sos")
    return sosfilt(sos, x)

def bandpass(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)

def pluck(freq, length, brightness=0.5, decay=0.996):
    """Karplus-Strong plucked string (guitar / oud / ukulele)."""
    n = int(length * SR)
    p = max(2, int(SR / freq))
    burst = rng.uniform(-1, 1, p)
    burst = lowpass(burst, 1500 + 7000 * brightness, 1)
    x = np.zeros(n)
    x[:p] = burst
    a = np.zeros(p + 2)
    a[0] = 1
    a[p] = -decay * 0.5
    a[p + 1] = -decay * 0.5
    y = lfilter([1.0], a, x)
    return y / (np.max(np.abs(y)) + 1e-9)

def kick(length=0.45, punch=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 7)
    click = rng.uniform(-1, 1, n) * np.exp(-t * 300) * 0.25
    return (y + click) * punch

def snare(length=0.3):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.uniform(-1, 1, n), 1500, 9000) * np.exp(-t * 18)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5
    return noise * 0.9 + tone

def clap(length=0.25):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = bandpass(rng.uniform(-1, 1, n), 900, 6000)
    e = np.zeros(n)
    for off in (0, 0.011, 0.022):
        i = int(off * SR)
        e[i:] += np.exp(-(t[: n - i]) * 60)
    e += np.exp(-t * 14) * 0.6
    return noise * e * 0.8

def hat(length=0.06, open_=False):
    n = int((0.25 if open_ else length) * SR)
    t = np.arange(n) / SR
    noise = highpass(rng.uniform(-1, 1, n), 7000)
    return noise * np.exp(-t * (14 if open_ else 70)) * 0.5

def tom(freq=110, length=0.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)

def doum(length=0.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 80 + 60 * np.exp(-t * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    return body + lowpass(rng.uniform(-1, 1, n), 600) * np.exp(-t * 40) * 0.3

def tek(length=0.12):
    n = int(length * SR)
    t = np.arange(n) / SR
    ring = np.sin(2 * np.pi * 820 * t) * np.exp(-t * 45) * 0.5
    noise = bandpass(rng.uniform(-1, 1, n), 2000, 8000) * np.exp(-t * 60)
    return ring + noise

def reverb(x, seconds=2.0, mix=0.25, tone=5000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir_l = lowpass(rng.uniform(-1, 1, n), tone) * np.exp(-t * 6.9 / seconds)
    ir_r = lowpass(rng.uniform(-1, 1, n), tone) * np.exp(-t * 6.9 / seconds)
    ir_l[:200] = 0
    ir_r[:200] = 0
    wl = fftconvolve(x, ir_l)[: len(x)]
    wr = fftconvolve(x, ir_r)[: len(x)]
    wl /= np.max(np.abs(wl)) + 1e-9
    wr /= np.max(np.abs(wr)) + 1e-9
    peak = np.max(np.abs(x)) + 1e-9
    return np.stack([x * (1 - mix) + wl * mix * peak, x * (1 - mix) + wr * mix * peak])

class Mix:
    def __init__(self):
        self.buses = {}

    def add(self, bus, sig, at, gain=1.0, pan=0.0):
        buf = self.buses.setdefault(bus, np.zeros((2, N)))
        i = int(at * SR)
        if i >= N:
            return
        seg = sig[: N - i] * gain
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        buf[0, i : i + len(seg)] += seg * l * 1.414
        buf[1, i : i + len(seg)] += seg * r * 1.414

    def bus(self, name):
        return self.buses.get(name, np.zeros((2, N)))

def sidechain(sig, beats, beat_len, depth=0.6):
    g = np.ones(N)
    for b in beats:
        i = int(b * SR)
        L = int(beat_len * 0.9 * SR)
        if i >= N:
            continue
        curve = 1 - depth * np.exp(-np.arange(L) / (0.12 * SR))
        g[i : i + L] = np.minimum(g[i : i + L], curve[: N - i])
    return sig * g

def master(stereo, name, title, artist, genre):
    stereo = stereo - np.mean(stereo, axis=1, keepdims=True)
    fade_in = int(0.05 * SR)
    fade_out = int(1.2 * SR)
    stereo[:, :fade_in] *= np.linspace(0, 1, fade_in)
    stereo[:, -fade_out:] *= np.linspace(1, 0, fade_out)
    peak = np.max(np.abs(stereo)) + 1e-9
    stereo = stereo / peak * 0.98
    stereo = np.tanh(stereo * 1.6) / np.tanh(1.6)
    stereo = stereo / (np.max(np.abs(stereo)) + 1e-9) * 0.89
    raw = (stereo.T * 32767).astype("<i2").tobytes()
    wav = os.path.join(OUT, f"{name}.raw")
    with open(wav, "wb") as f:
        f.write(raw)
    m4a = os.path.join(OUT, f"{name}.m4a")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", wav,
         "-c:a", "aac", "-b:a", "112k", "-metadata", f"title={title}", "-metadata", f"artist={artist}",
         "-metadata", f"genre={genre}", m4a],
        check=True,
    )
    os.remove(wav)
    print("wrote", m4a, os.path.getsize(m4a))

CHORDS = {"maj": [0, 4, 7], "min": [0, 3, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10], "sus2": [0, 2, 7], "dom7": [0, 4, 7, 10]}

def chord_tones(root, quality):
    return [root + i for i in CHORDS[quality]]

# ---------------------------------------------------------------- tracks

def sunrise_drive():
    bpm = 120; beat = 60 / bpm; m = Mix()
    prog = [(60, "maj"), (67, "maj"), (69, "min"), (65, "maj")]
    bars = int(DUR / (beat * 4)) + 1
    kicks = []
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        for b in range(4):
            m.add("drums", kick(), t0 + b * beat, 0.9); kicks.append(t0 + b * beat)
            m.add("drums", hat(), t0 + b * beat + beat / 2, 0.5, 0.3)
            if b in (1, 3):
                m.add("drums", clap(), t0 + b * beat, 0.55, -0.1)
        tones = chord_tones(root, q)
        for k, st in enumerate([0, 1.5, 2, 3.5]):
            stab = sum(osc("saw", midi(n), beat * 0.45, d) for n in tones for d in (-0.004, 0.004))
            stab = lowpass(stab * env_adsr(beat * 0.45, 0.005, 0.1, 0.4, 0.1), 2600)
            m.add("keys", stab, t0 + st * beat, 0.11, 0.2 if k % 2 else -0.2)
        for b8 in range(8):
            n = root - 24 + (12 if b8 % 2 else 0)
            bs = osc("square", midi(n), beat * 0.45) * env_adsr(beat * 0.45, 0.005, 0.05, 0.6, 0.05)
            m.add("bass", lowpass(bs, 700), t0 + b8 * beat / 2, 0.32)
        if bar >= 4:
            mel = [72, 74, 76, 79, 76, 74, 72, 69]
            for i, n in enumerate(mel):
                if (bar + i) % 3 == 0:
                    continue
                note = osc("tri", midi(n), beat * 0.48) * env_adsr(beat * 0.48, 0.01, 0.1, 0.5, 0.1)
                m.add("lead", note, t0 + i * beat / 2, 0.16, 0.1)
    keys = reverb(sidechain(m.bus("keys")[0] + m.bus("keys")[1], kicks, beat), 1.6, 0.3)
    lead = reverb(m.bus("lead")[0] + m.bus("lead")[1], 1.8, 0.35)
    bass = sidechain(m.bus("bass"), kicks, beat, 0.5)
    master(m.bus("drums") + keys + lead + bass, "sunrise-drive", "Sunrise Drive", "Sohba Sounds", "Upbeat")

def midnight_lofi():
    bpm = 78; beat = 60 / bpm; m = Mix()
    prog = [(62, "min7"), (67, "dom7"), (60, "maj7"), (57, "min7")]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        m.add("drums", kick(0.5, 0.8), t0, 0.8)
        m.add("drums", kick(0.5, 0.7), t0 + 2.5 * beat, 0.7)
        m.add("drums", snare(), t0 + beat, 0.45)
        m.add("drums", snare(), t0 + 3 * beat, 0.45)
        for e in range(8):
            swing = 0.06 * beat if e % 2 else 0
            m.add("drums", hat(), t0 + e * beat / 2 + swing, 0.32 if e % 2 else 0.4, 0.25)
        tones = chord_tones(root, q)
        chord = sum(osc("sine", midi(n), beat * 3.8) + 0.3 * osc("sine", midi(n) * 2, beat * 3.8) for n in tones)
        chord *= env_adsr(beat * 3.8, 0.04, 0.6, 0.55, 0.6) * (1 + 0.15 * np.sin(2 * np.pi * 5 * np.arange(int(beat * 3.8 * SR)) / SR))
        m.add("keys", lowpass(chord, 1800), t0, 0.12)
        bs = osc("sine", midi(root - 24), beat * 1.8) * env_adsr(beat * 1.8, 0.01, 0.3, 0.6, 0.3)
        m.add("bass", bs, t0, 0.4); m.add("bass", bs, t0 + 2.5 * beat, 0.35)
    keys = reverb(m.bus("keys")[0] + m.bus("keys")[1], 2.2, 0.35, 3500)
    drums = m.bus("drums"); drums = np.stack([lowpass(drums[0], 6000), lowpass(drums[1], 6000)])
    vinyl = np.stack([highpass(rng.uniform(-1, 1, N), 3000) * 0.01] * 2)
    crackle = np.zeros(N); idx = rng.integers(0, N, 900); crackle[idx] = rng.uniform(-0.25, 0.25, 900)
    master(drums + keys + m.bus("bass") + vinyl + np.stack([crackle, crackle]), "midnight-lofi", "Midnight Lo-fi", "Sohba Sounds", "Lo-fi")

def golden_hour():
    bpm = 96; beat = 60 / bpm; m = Mix()
    prog = [(64, "maj"), (71, "maj"), (61, "min"), (69, "maj")]
    pattern = [0, 1, 2, 1, 3, 1, 2, 1]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        root, q = prog[bar % 4]
        tones = chord_tones(root - 12, q) + [root]
        t0 = bar * 4 * beat
        for i, p in enumerate(pattern):
            n = tones[p % len(tones)]
            m.add("gtr", pluck(midi(n), beat * 2.5, 0.45, 0.997), t0 + i * beat / 2, 0.42, -0.3 if i % 2 else 0.3)
        m.add("bass", pluck(midi(root - 24), beat * 3, 0.2, 0.998), t0, 0.5)
        m.add("bass", pluck(midi(root - 24 + 7), beat * 2, 0.2, 0.998), t0 + 2 * beat, 0.4)
        if bar >= 2:
            m.add("perc", hat(0.05), t0 + beat, 0.25); m.add("perc", hat(0.05), t0 + 3 * beat, 0.25)
            m.add("perc", kick(0.35, 0.5), t0, 0.5); m.add("perc", kick(0.35, 0.5), t0 + 2.5 * beat, 0.4)
    gtr = reverb(m.bus("gtr")[0] + m.bus("gtr")[1], 2.0, 0.3)
    master(gtr + m.bus("bass") + m.bus("perc"), "golden-hour", "Golden Hour", "Sohba Sounds", "Acoustic")

def city_lights():
    bpm = 88; beat = 60 / bpm; m = Mix()
    prog = [(57, "min"), (53, "maj"), (55, "maj"), (52, "min")]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        m.add("drums", kick(0.5, 1.0), t0, 0.9); m.add("drums", kick(0.5, 0.9), t0 + 1.75 * beat, 0.7)
        m.add("drums", kick(0.5, 0.9), t0 + 2.5 * beat, 0.8)
        m.add("drums", snare(0.35), t0 + beat, 0.7); m.add("drums", snare(0.35), t0 + 3 * beat, 0.7)
        for e in range(16):
            if e % 4 == 3 and bar % 2:
                continue
            m.add("drums", hat(0.04), t0 + e * beat / 4, 0.22 if e % 2 else 0.32, 0.3)
        n = int(beat * 3.5 * SR); t = np.arange(n) / SR
        sub = np.sin(2 * np.pi * midi(root - 24) * t) * np.exp(-t * 0.9)
        m.add("bass", np.tanh(sub * 2) * 0.8, t0, 0.55)
        tones = chord_tones(root, q)
        for k, st in enumerate([0, 0.75, 2, 2.75]):
            pn = sum(osc("sine", midi(nn), beat * 0.9) * (1 + 0.5 * osc("sine", midi(nn) * 3, beat * 0.9)) for nn in tones)
            pn *= env_adsr(beat * 0.9, 0.003, 0.25, 0.3, 0.3)
            m.add("keys", pn, t0 + st * beat, 0.09, 0.15)
    keys = reverb(m.bus("keys")[0] + m.bus("keys")[1], 1.8, 0.3, 4000)
    master(m.bus("drums") + m.bus("bass") + keys, "city-lights", "City Lights", "Sohba Sounds", "Hip-hop")

def epic_rise():
    bpm = 72; beat = 60 / bpm; m = Mix()
    prog = [(50, "min"), (46, "maj"), (53, "maj"), (48, "maj")]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        tones = chord_tones(root, q) + [root + 12]
        pad = sum(osc("saw", midi(n), beat * 4.2, d) for n in tones for d in (-0.006, 0, 0.006))
        cutoff = 600 + 3000 * min(1, bar / bars * 1.4)
        pad = lowpass(pad * env_adsr(beat * 4.2, 0.6, 0.5, 0.8, 0.8), cutoff)
        m.add("pad", pad, t0, 0.06)
        m.add("low", osc("sine", midi(root - 24), beat * 4) * env_adsr(beat * 4, 0.2, 0.5, 0.8, 0.5), t0, 0.35)
        intensity = min(1, bar / bars * 1.6)
        hits = [0, 1.5, 2, 3, 3.5] if bar >= bars // 3 else [0, 2]
        for h in hits:
            m.add("drums", tom(70, 0.9), t0 + h * beat, 0.6 * (0.5 + intensity), -0.2)
            if bar >= bars // 2:
                m.add("drums", tom(110, 0.5), t0 + h * beat + beat / 2, 0.35 * intensity, 0.2)
        if bar >= bars // 2:
            mel = [74, 77, 76, 72]
            note = osc("saw", midi(mel[bar % 4]), beat * 3.5) * env_adsr(beat * 3.5, 0.15, 0.4, 0.7, 0.6)
            m.add("lead", lowpass(note, 2800), t0, 0.08)
    pad = reverb(m.bus("pad")[0] + m.bus("pad")[1], 3.5, 0.45, 4000)
    lead = reverb(m.bus("lead")[0] + m.bus("lead")[1], 3.0, 0.4)
    drums = reverb(m.bus("drums")[0] + m.bus("drums")[1], 2.5, 0.25, 3000)
    master(pad + lead + drums + m.bus("low"), "epic-rise", "Epic Rise", "Sohba Sounds", "Cinematic")

def neon_pulse():
    bpm = 126; beat = 60 / bpm; m = Mix()
    prog = [(57, "min"), (53, "maj"), (60, "maj"), (55, "maj")]
    bars = int(DUR / (beat * 4)) + 1
    kicks = []
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        for b in range(4):
            m.add("drums", kick(0.4, 1.0), t0 + b * beat, 0.95); kicks.append(t0 + b * beat)
            m.add("drums", hat(0.08, open_=True), t0 + b * beat + beat / 2, 0.3, 0.2)
        m.add("drums", clap(), t0 + beat, 0.5); m.add("drums", clap(), t0 + 3 * beat, 0.5)
        tones = chord_tones(root, q)
        arp = tones + [tones[1] + 12, tones[0] + 12, tones[2]]
        for i in range(16):
            n = arp[i % len(arp)] + 12
            note = osc("saw", midi(n), beat / 4 * 0.9) * env_adsr(beat / 4 * 0.9, 0.002, 0.05, 0.3, 0.03)
            cutoff = 1200 + 2400 * (0.5 + 0.5 * np.sin(2 * np.pi * (bar * 16 + i) / 64))
            m.add("arp", lowpass(note, cutoff), t0 + i * beat / 4, 0.12, 0.35 if i % 2 else -0.35)
        pad = sum(osc("saw", midi(n), beat * 4, d) for n in tones for d in (-0.008, 0.008))
        m.add("pad", lowpass(pad * env_adsr(beat * 4, 0.05, 0.3, 0.7, 0.3), 1800), t0, 0.05)
        for e in range(8):
            bs = osc("saw", midi(root - 24), beat / 2 * 0.8) * env_adsr(beat / 2 * 0.8, 0.003, 0.05, 0.6, 0.05)
            m.add("bass", lowpass(bs, 500), t0 + e * beat / 2 + beat / 4, 0.3)
    pad = sidechain(reverb(m.bus("pad")[0] + m.bus("pad")[1], 2.0, 0.3), kicks, beat, 0.7)
    arp = reverb(m.bus("arp")[0] + m.bus("arp")[1], 1.2, 0.25)
    master(m.bus("drums") + pad + arp + sidechain(m.bus("bass"), kicks, beat, 0.4), "neon-pulse", "Neon Pulse", "Sohba Sounds", "Electronic")

def desert_wind():
    """Hijaz-mode melody on an oud-like plucked string over a darbuka maqsum rhythm."""
    bpm = 100; beat = 60 / bpm; m = Mix()
    hijaz = [62, 63, 66, 67, 69, 70, 72, 74]
    phrase = [0, 1, 2, 3, 4, 3, 2, 1, 2, 1, 0, 0, 4, 5, 4, 3, 2, 3, 2, 1, 0, 1, 2, 0]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        t0 = bar * 4 * beat
        # maqsum: D T - T D - T -
        for pos, kind in [(0, "D"), (0.5, "T"), (1.5, "T"), (2, "D"), (3, "T")]:
            m.add("perc", doum() if kind == "D" else tek(), t0 + pos * beat, 0.7 if kind == "D" else 0.45, -0.15 if kind == "D" else 0.2)
        for f in (1, 2.5, 3.5):
            m.add("perc", tek(0.08) * 0.6, t0 + f * beat, 0.25, 0.3)
        m.add("drone", osc("saw", midi(50), beat * 4.1) * env_adsr(beat * 4.1, 0.3, 0.5, 0.8, 0.4), t0, 0.03)
        m.add("drone", osc("saw", midi(57), beat * 4.1) * env_adsr(beat * 4.1, 0.3, 0.5, 0.8, 0.4), t0, 0.02)
        if bar >= 1:
            for i in range(6):
                idx = phrase[(bar * 6 + i) % len(phrase)]
                n = hijaz[idx]
                st = t0 + i * (4 * beat / 6)
                m.add("oud", pluck(midi(n), beat * 1.6, 0.65, 0.993), st, 0.5, 0.1)
                if i % 3 == 2:
                    m.add("oud", pluck(midi(n), beat * 0.6, 0.6, 0.99), st + beat / 3, 0.25, 0.1)
    oud = reverb(m.bus("oud")[0] + m.bus("oud")[1], 2.2, 0.3, 4500)
    drone = reverb(lowpass(m.bus("drone")[0] + m.bus("drone")[1], 900), 2.5, 0.4)
    master(oud + drone + m.bus("perc"), "desert-wind", "Desert Wind", "Sohba Sounds", "Arabic")

def happy_steps():
    bpm = 112; beat = 60 / bpm; m = Mix()
    prog = [(67, "maj"), (64, "min"), (60, "maj"), (62, "maj")]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        tones = chord_tones(root, q)
        for st in (0, 0.5, 1.5, 2, 2.5, 3.5):
            for k, n in enumerate(tones):
                m.add("uke", pluck(midi(n), beat, 0.8, 0.99), t0 + st * beat + k * 0.012, 0.18, 0.25)
        m.add("drums", kick(0.3, 0.6), t0, 0.6); m.add("drums", kick(0.3, 0.6), t0 + 2 * beat, 0.6)
        m.add("drums", clap(), t0 + beat, 0.45); m.add("drums", clap(), t0 + 3 * beat, 0.45)
        for e in range(8):
            m.add("drums", hat(0.03), t0 + e * beat / 2, 0.2, -0.3)
        m.add("bass", osc("sine", midi(root - 24), beat * 0.9) * env_adsr(beat * 0.9, 0.005, 0.2, 0.5, 0.2), t0, 0.4)
        m.add("bass", osc("sine", midi(root - 17), beat * 0.9) * env_adsr(beat * 0.9, 0.005, 0.2, 0.5, 0.2), t0 + 2 * beat, 0.35)
        if bar % 2 == 1:
            whistle = [79, 81, 83, 81, 79, 76]
            for i, n in enumerate(whistle):
                w = osc("sine", midi(n), beat * 0.45) * env_adsr(beat * 0.45, 0.02, 0.05, 0.7, 0.1)
                m.add("lead", w, t0 + i * beat / 2, 0.12)
    uke = reverb(m.bus("uke")[0] + m.bus("uke")[1], 1.2, 0.2)
    lead = reverb(m.bus("lead")[0] + m.bus("lead")[1], 1.5, 0.3)
    master(uke + lead + m.bus("drums") + m.bus("bass"), "happy-steps", "Happy Steps", "Sohba Sounds", "Happy")

def deep_focus():
    bpm = 64; beat = 60 / bpm; m = Mix()
    prog = [(52, "sus2"), (48, "maj7"), (55, "sus2"), (50, "min7")]
    bars = int(DUR / (beat * 4)) + 1
    for bar in range(bars):
        root, q = prog[bar % 4]
        t0 = bar * 4 * beat
        tones = chord_tones(root, q) + [root + 12]
        pad = sum(osc("tri", midi(n), beat * 4.6, d) for n in tones for d in (-0.003, 0.003))
        m.add("pad", lowpass(pad * env_adsr(beat * 4.6, 1.2, 0.5, 0.8, 1.2), 1400), t0, 0.07)
        for i in range(4):
            n = tones[(bar + i * 2) % len(tones)] + 24
            bell = (osc("sine", midi(n), beat * 2) + 0.4 * osc("sine", midi(n) * 2.76, beat * 2)) * np.exp(-np.arange(int(beat * 2 * SR)) / SR * 2.5)
            m.add("bell", bell, t0 + i * beat + (0.25 * beat if i % 2 else 0), 0.06, -0.4 if i % 2 else 0.4)
    pad = reverb(m.bus("pad")[0] + m.bus("pad")[1], 4.0, 0.5, 3000)
    bell = reverb(m.bus("bell")[0] + m.bus("bell")[1], 3.5, 0.5)
    master(pad + bell, "deep-focus", "Deep Focus", "Sohba Sounds", "Ambient")

if __name__ == "__main__":
    for fn in [sunrise_drive, midnight_lofi, golden_hour, city_lights, epic_rise, neon_pulse, desert_wind, happy_steps, deep_focus]:
        fn()
