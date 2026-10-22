#!/usr/bin/env python3
"""Key the supplied green-screen videos and produce native masters + dsh-pet clips.

Requires Python 3, numpy, scipy, and FFmpeg with libvpx-vp9. Run from any directory.
The input files are kept byte-for-byte under materials/animation-v1/original/.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import numpy as np
from scipy.ndimage import minimum_filter

ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / 'materials' / 'animation-v1'
ORIGINAL = MATERIALS / 'original'
MASTERS = MATERIALS / 'transparent-masters'
RUNTIME = ROOT / 'pet' / 'anzuki-animation'
WIDTH, HEIGHT, FPS = 720, 1280, 24

# Frame-exact intervals [start, end); the uncut source has exactly 240 video frames.
CLIPS = [
    ('idle-loop-long', 'video2_loop_long.mp4', 0, 94, 'normal idle; user-selected loop_long'),
    ('idle-loop-short', 'video2_loop_short.mp4', 0, 60, 'alternate idle, not in default random pool'),
    ('click-bounce-1', 'gemini_generated_video_1019414a.mp4', 6, 60, 'first expressive in-place bounce'),
    ('click-bounce-2', 'gemini_generated_video_1019414a.mp4', 72, 128, 'second in-place bounce'),
]

def key_frame(frame):
    rgb = frame.astype(np.float32)
    # The backgrounds are shaded/encoded green, not literal #00ff00.
    # Green dominance separates the backdrop without keying white hair, gold or blue.
    excess = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    t = np.clip((excess - 12.0) / 73.0, 0, 1)
    alpha = 1.0 - t * t * (3.0 - 2.0 * t)
    border = np.concatenate((rgb[:16].reshape(-1, 3), rgb[-16:].reshape(-1, 3)))
    screen = np.median(border, axis=0)
    # Reconstruct edge color after accounting for the green background contribution.
    # A fractional one-pixel choke suppresses compressed green fringes.
    alpha = .65 * alpha + .35 * minimum_filter(alpha, size=3)
    safe = np.maximum(alpha, .025)
    clean = (rgb - screen[None, None, :] * (1 - alpha[..., None])) / safe[..., None]
    clean = np.clip(clean, 0, 255)
    edge = excess > 0
    clean[..., 1] = np.where(edge,
        np.minimum(clean[..., 1], np.maximum(clean[..., 0], clean[..., 2])),
        clean[..., 1])
    clean[alpha < .01] = 0
    alpha[alpha < .01] = 0
    return np.dstack((clean, alpha * 255)).round().astype(np.uint8)

def encode_clip(name, source, first, end):
    decoder = subprocess.Popen([
        'ffmpeg', '-v', 'error', '-i', str(ORIGINAL / source),
        '-vf', f'trim=start_frame={first}:end_frame={end},setpts=PTS-STARTPTS',
        '-an', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'
    ], stdout=subprocess.PIPE)
    common = ['-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p',
              '-auto-alt-ref', '0', '-b:v', '0', '-deadline', 'good',
              '-cpu-used', '4', '-threads', '2']
    encoder = subprocess.Popen([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '720x1280',
        '-framerate', '24', '-i', '-',
        '-filter_complex',
        '[0:v]split[m][r];[m]format=yuva420p[master];'
        '[r]scale=158:280:flags=lanczos,setsar=1,'
        'pad=640:360:241:50:color=black@0,format=yuva420p[runtime]',
        '-map', '[master]', *common, '-crf', '24', str(MASTERS / (name + '.webm')),
        '-map', '[runtime]', *common, '-crf', '26', str(RUNTIME / (name + '.webm'))
    ], stdin=subprocess.PIPE)
    count = 0
    try:
        while True:
            raw = decoder.stdout.read(WIDTH * HEIGHT * 3)
            if not raw:
                break
            if len(raw) != WIDTH * HEIGHT * 3:
                raise RuntimeError('Truncated decoded frame')
            frame = np.frombuffer(raw, np.uint8).reshape(HEIGHT, WIDTH, 3)
            encoder.stdin.write(key_frame(frame).tobytes())
            count += 1
    finally:
        encoder.stdin.close()
        decoder.stdout.close()
    if decoder.wait() or encoder.wait():
        raise RuntimeError('FFmpeg failed for ' + name)
    if count != end - first:
        raise RuntimeError(f'Unexpected frame count: {name}: {count}')
    return count

def main():
    MASTERS.mkdir(parents=True, exist_ok=True)
    RUNTIME.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, source, first, end, purpose in CLIPS:
        count = encode_clip(name, source, first, end)
        entries.append(dict(name=name, source=source, start_frame=first, end_frame_exclusive=end,
                            start_seconds=first/FPS, end_seconds=end/FPS, fps=FPS,
                            frames=count, duration_seconds=count/FPS, purpose=purpose,
                            master=f'transparent-masters/{name}.webm',
                            runtime=f'../../pet/anzuki-animation/{name}.webm'))
        print(f'{name}: {count} frames, {count/FPS:.6f}s', flush=True)
    inputs = [{ 'file': p.name, 'bytes': p.stat().st_size,
                'sha256': hashlib.sha256(p.read_bytes()).hexdigest() }
              for p in sorted(ORIGINAL.glob('*.mp4'))]
    manifest = dict(fps=FPS, input_size=[WIDTH,HEIGHT], runtime_size=[640,360],
                    runtime_scale=[158,280], runtime_offset=[241,50],
                    key=dict(green_excess_low=12,green_excess_high=85,edge_despill=True,
                             fractional_choke=.35),
                    originals=inputs, clips=entries)
    (MATERIALS / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    # Android is derived from the exact desktop configuration and playback clips.
    import sys
    subprocess.run([sys.executable, ROOT/'scripts/sync-android-assets.py'], check=True)

if __name__ == '__main__':
    main()
