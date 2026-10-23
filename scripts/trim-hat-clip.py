#!/usr/bin/env python3
"""Remove the first 48 WebP frame chunks without encoding any image data."""
from pathlib import Path
from PIL import Image
import hashlib, io, json, shutil, struct
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'materials/animation-v3/full-resolution/adjust-hat.webp'
OUT = ROOT / 'materials/animation-v4-trim'
old = next(c for c in json.loads((ROOT / 'materials/animation-v3/manifest.json').read_text())['clips'] if c['name'] == 'adjust-hat')
source = SOURCE.read_bytes()
assert hashlib.sha256(source).hexdigest() == old['sha256']
assert source[:4] == b'RIFF' and source[8:12] == b'WEBP'
assert int.from_bytes(source[4:8], 'little') == len(source) - 8
chunks, frame, offset, removed_ms, kept_ms = [], 0, 12, 0, 0
while offset < len(source):
    size = int.from_bytes(source[offset+4:offset+8], 'little')
    end = offset + 8 + size + (size & 1)
    assert end <= len(source)
    chunk = source[offset:end]
    if chunk[:4] == b'ANMF':
        duration = int.from_bytes(chunk[20:23], 'little')
        if frame < 48:
            removed_ms += duration
        else:
            chunks.append(chunk)
            kept_ms += duration
        frame += 1
    else:
        chunks.append(chunk)
    offset = end
assert frame == 240 and removed_ms == 2000 and 7999 <= kept_ms <= 8001
body = b'WEBP' + b''.join(chunks)
trimmed = b'RIFF' + struct.pack('<I', len(body)) + body
pixel_hashes, rgba_hashes = [], []
with Image.open(io.BytesIO(trimmed)) as image, Image.open(io.BytesIO(source)) as original:
    assert image.size == (720, 1280) and image.n_frames == 192
    for i in range(image.n_frames):
        image.seek(i)
        original.seek(48+i)
        rgba = np.array(image.convert('RGBA'), dtype=np.uint8, copy=True)
        assert np.array_equal(rgba, np.asarray(original.convert('RGBA'))), f'RGBA mismatch at retained frame {i}'
        rgba_hashes.append(hashlib.sha256(rgba.tobytes()).hexdigest())
        rgba[rgba[...,3] == 0, :3] = 0  # Match the existing verification hash convention.
        digest = hashlib.sha256(rgba.tobytes()).hexdigest()
        assert digest == old['decodedPixelHashes'][48+i], f'Retained frame {i} differs from source frame {48+i}'
        pixel_hashes.append(digest)
record = {**old, 'source': '../animation-v3/original/扶帽子.mp4', 'frames': 192,
          'duration_seconds': 8.0, 'encodedDurationMs': kept_ms, 'master': 'adjust-hat.webp',
          'sha256': hashlib.sha256(trimmed).hexdigest(), 'decodedPixelHashes': pixel_hashes, 'decodedRgbaPixelHashes': rgba_hashes,
          'sourceFrameRange': {'first': 48, 'lastInclusive': 239},
          'removedLeadingFrames': 48, 'removedLeadingMilliseconds': removed_ms,
          'imageChunksReusedByteForByte': True, 'rgbaPixelsChanged': 0}
manifest = {'complete': True, 'policy': 'Original WebP image chunks retained byte-for-byte; no image encoding or compression',
            'sourceMaster': str(SOURCE.relative_to(ROOT)), 'sourceMasterSha256': old['sha256'], 'clips': [record]}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'adjust-hat.webp').write_bytes(trimmed)
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
shutil.copy2(OUT / 'adjust-hat.webp', ROOT / 'pet/anzuki-animation/adjust-hat.webp')
print(f'PASS hat trim: 48 leading frames removed, all 192 retained frame chunks and decoded RGBA pixels unchanged; {len(trimmed)} bytes')
