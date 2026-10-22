#!/usr/bin/env python3
"""Regenerate desktop clips, Android assets and a signed Android APK together."""
from pathlib import Path
import argparse,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--sdk',required=True);args=parser.parse_args()
for command in [
    [sys.executable,ROOT/'scripts/process-videos.py'],
    [sys.executable,ROOT/'android/build.py','--sdk',args.sdk],
    [sys.executable,ROOT/'scripts/check-platform-sync.py'],
]:subprocess.run([str(x) for x in command],check=True)
