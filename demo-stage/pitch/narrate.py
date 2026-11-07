"""Generate a narrated track aligned to the five pitch scenes."""
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
LINES = [
    "At this Waterloo site, six buildings with three hundred and seventy six apartments already have consent. A state proposal seeks about two hundred and fifty more. Those are different stages.",
    "The apartment listing looks bright today. Before inspection, a buyer needs to see what is planned nearby.",
    "Next Door Next Year checks the exact unit, then places the nearby development beside the listing, with consent and proposal clearly separated.",
    "The buyer leaves with a question: do the official planning documents assess shadows at this building? The project record is one click away.",
    "Each verified record keeps its own reference, status and official link. Unverified candidates stay labelled, so buyers know what to check before making an offer.",
]
STARTS = [0.25, 9.65, 16.7, 24.7, 34.7]
DURATION = 44.33


def duration(path: Path) -> float:
    return float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)
    ], text=True).strip())


inputs = []
filters = []
for index, (line, start) in enumerate(zip(LINES, STARTS)):
    path = HERE / f"voice-{index}.aiff"
    subprocess.run(["say", "-v", "Karen", "-r", "215", "-o", str(path), line], check=True)
    length = duration(path)
    next_start = STARTS[index + 1] if index + 1 < len(STARTS) else DURATION
    if start + length > next_start - 0.15:
        raise RuntimeError(f"Voice segment {index + 1} runs past its scene: {length:.2f}s")
    print(f"Scene {index + 1}: {length:.2f}s at {start:.2f}s")
    inputs += ["-i", str(path)]
    delay = round(start * 1000)
    filters.append(f"[{index}:a]adelay={delay}|{delay}[v{index}]")
filters.append("".join(f"[v{i}]" for i in range(len(LINES))) + f"amix=inputs={len(LINES)}:duration=longest:normalize=0,apad=whole_dur={DURATION},loudnorm=I=-18:TP=-2:LRA=11[out]")
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs,
    "-filter_complex", ";".join(filters), "-map", "[out]", "-t", str(DURATION),
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", str(HERE / "narration.m4a")
], check=True)
