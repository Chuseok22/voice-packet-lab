#!/usr/bin/env bash
# macOS 전용: 개발용 임시 음원을 만든다. 발표 전에 직접 녹음한 48kHz 모노 WAV로 교체할 것.
set -euo pipefail

OUTPUT="client/public/audio/sample.wav"
TEXT="안녕하세요. 컴퓨터 네트워크 발표입니다."
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$(dirname "$OUTPUT")"
say -v Yuna -o "$WORK_DIR/sample.aiff" "$TEXT"
afconvert -f WAVE -d LEI16@48000 -c 1 "$WORK_DIR/sample.aiff" "$OUTPUT"
afinfo "$OUTPUT" | grep -E 'estimated duration|Data format'
