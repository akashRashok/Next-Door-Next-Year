"""Create the short voice track, aligned to the Stageshow scene beats."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
voice = root / 'voice'
voice.mkdir(exist_ok=True)
lines = [
    'This Waterloo listing highlights abundant natural light.',
    'One click checks the listing address.',
    'The exact unit is verified: one bedroom.',
    'A planning site sits one hundred and fifty eight metres northwest.',
    'Existing consent and a new proposal have different stages.',
    'Open the official record and ask about shadows at inspection.',
]
starts = [0.15, 2.55, 4.15, 6.5, 9.15, 11.8]
inputs = []
filters = []
for i, (line, start) in enumerate(zip(lines, starts)):
    path = voice / f'{i:02d}.aiff'
    subprocess.run(['say', '-v', 'Samantha', '-r', '235', '-o', str(path), line], check=True)
    inputs += ['-i', str(path)]
    filters.append(f'[{i}:a]adelay={round(start * 1000)}|{round(start * 1000)}[a{i}]')
filters.append(''.join(f'[a{i}]' for i in range(len(lines))) + f'amix=inputs={len(lines)}:duration=longest,apad=whole_dur=16[aout]')
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inputs,
    '-filter_complex', ';'.join(filters), '-map', '[aout]', '-t', '16',
    '-c:a', 'aac', '-b:a', '160k', str(root / 'voice.m4a')
], check=True)
