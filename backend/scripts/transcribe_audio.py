import argparse
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def main():
    parser = argparse.ArgumentParser(description="Transcribe an audio file with faster-whisper.")
    parser.add_argument("--file", required=True, help="Absolute path to the audio file")
    parser.add_argument("--model", default="small", help="Whisper model name")
    parser.add_argument("--device", default="auto", help="Inference device: auto/cpu/cuda")
    parser.add_argument("--compute-type", default="int8", help="Compute type: int8/float16/float32")
    parser.add_argument("--language", default="", help="Optional language hint, e.g. en")
    args = parser.parse_args()

    audio_path = Path(args.file)
    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = WhisperModel(args.model, device=args.device, compute_type=args.compute_type)
    segments, info = model.transcribe(
        str(audio_path),
        language=args.language or None,
        vad_filter=True,
        condition_on_previous_text=False,
    )

    text = " ".join(segment.text.strip() for segment in segments if segment.text).strip()
    result = {
        "text": text,
        "language": info.language,
        "duration": info.duration,
        "duration_after_vad": info.duration_after_vad,
    }
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
