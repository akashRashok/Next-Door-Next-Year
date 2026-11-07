"""Build captioned, narrated hackathon videos from the verified report copy.

The demo video is explicitly marked as a UI preview until browser QA is complete.
Requires macOS `say`, Pillow, ffmpeg and ffprobe.
"""
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = Path('/System/Library/Fonts/Supplemental')
REG = str(FONT_DIR / 'Arial.ttf')
BOLD = str(FONT_DIR / 'Arial Bold.ttf')
WIDTH, HEIGHT = 1280, 720
BG = '#153b3f'
LIGHT = '#f5f6f0'
GREEN = '#c7e8b8'
DARK = '#14383a'
MUTED = '#cde1db'


def font(size: int, bold: bool = False):
    return ImageFont.truetype(BOLD if bold else REG, size)


def wrap(draw, text: str, face, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split('\n'):
        line = ''
        for word in paragraph.split():
            candidate = f'{line} {word}'.strip()
            if line and draw.textbbox((0, 0), candidate, font=face)[2] > max_width:
                lines.append(line)
                line = word
            else:
                line = candidate
        lines.append(line)
    return lines


def paragraph(draw, xy, text, face, fill, width, gap=10):
    x, y = xy
    for line in wrap(draw, text, face, width):
        draw.text((x, y), line, font=face, fill=fill)
        y += face.size + gap
    return y


def pill(draw, box, text, fill, color=DARK):
    draw.rounded_rectangle(box, radius=20, fill=fill)
    draw.text((box[0] + 15, box[1] + 9), text, font=font(19, True), fill=color)


def render_slide(item: dict, index: int, count: int, output: Path, preview: bool):
    im = Image.new('RGB', (WIDTH, HEIGHT), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, WIDTH, 10), fill=GREEN)
    d.text((70, 52), 'NEXT DOOR  /  NEXT YEAR', font=font(21, True), fill=GREEN)
    d.text((70, 108), item['kicker'].upper(), font=font(18, True), fill=MUTED)
    title_size = 68 if len(item['title']) < 37 else 58
    y = paragraph(d, (70, 154), item['title'], font(title_size, True), LIGHT, 1080, 4)
    y += 24
    paragraph(d, (70, y), item['body'], font(32), LIGHT, 1050, 14)
    if item.get('badge'):
        pill(d, (70, 560, 70 + min(1050, len(item['badge']) * 14 + 34), 610), item['badge'], GREEN)
    d.line((70, 646, 1210, 646), fill='#54817b', width=2)
    d.text((70, 662), 'Source-backed planning evidence for apartment buyers', font=font(19), fill=MUTED)
    if preview:
        d.text((830, 662), 'UI PREVIEW · BROWSER QA PENDING', font=font(16, True), fill='#f5c486')
    else:
        d.text((1145, 662), f'{index + 1}/{count}', font=font(19, True), fill=GREEN)
    im.save(output)


def audio_duration(path: Path) -> float:
    result = subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(path)], text=True)
    return float(json.loads(result)['format']['duration'])


def build(name: str, slides: list[dict], preview: bool):
    with tempfile.TemporaryDirectory(prefix='ndny-video-') as folder:
        folder = Path(folder)
        parts = []
        for i, slide in enumerate(slides):
            png = folder / f'{i:02d}.png'
            voice = folder / f'{i:02d}.aiff'
            part = folder / f'{i:02d}.mp4'
            render_slide(slide, i, len(slides), png, preview)
            subprocess.run(['say', '-v', 'Samantha', '-r', '210', '-o', str(voice), slide['voice']], check=True)
            duration = audio_duration(voice) + 0.7
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '25', '-i', str(png), '-i', str(voice), '-t', str(duration), '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-c:a', 'aac', '-b:a', '128k', '-af', 'apad', str(part)], check=True)
            parts.append(part)
        concat = folder / 'concat.txt'
        concat.write_text(''.join(f"file '{p}'\n" for p in parts))
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', str(ROOT / name)], check=True)


PITCH = [
    dict(kicker='The hook', title='Approved for 376. Asking for about 250 more.', body='The same Waterloo site has two very different planning stages.', badge='Existing consent ≠ new proposal', voice='Approved for three hundred and seventy six apartments. Now the same Waterloo site is asking for about two hundred and fifty more. The difference matters before you buy nearby.'),
    dict(kicker='The buyer', title='Bright today. What about next year?', body='An east-facing apartment listing highlights natural light. Buyers need to see nearby plans before inspection.', badge='102/2 Sam Sing Street, Waterloo', voice='This listing highlights natural light. A buyer can see the apartment today, but a major site nearby raises a question about the future.'),
    dict(kicker='The product', title='One address. One clear comparison.', body='Next Door Next Year matches the unit, checks nearby sites, and separates consent from proposal.', badge='Chrome side panel · City of Sydney', voice='Next Door Next Year opens beside the listing. It confirms the exact unit and separates what is already consented from what is only proposed.'),
    dict(kicker='The evidence', title='Ask the useful question.', body='Do the official planning documents assess shadows at this building? Open the project record.', badge='No unsupported daylight prediction', voice='The panel gives the buyer a specific question: do the official planning documents assess shadows at this building? It links to the project record instead of guessing a sunlight outcome.'),
    dict(kicker='The trust rule', title='Status and source stay visible.', body='Every verified record carries its own reference, stage, and official link. Unverified results are labelled.', badge='Built for the decision before an offer', voice='Each verified record has its own reference, status and official link. Unverified candidates stay clearly labelled. That is how a buyer knows what to check before making an offer.'),
]

DEMO = [
    dict(kicker='Prototype walkthrough', title='Next Door Next Year', body='This video previews the built workflow. The flagship and ten-address checks used the live team key; Chrome installation QA is pending.', badge='UI PREVIEW', voice='This is a preview of the built workflow. Live API checks are complete; Chrome installation quality assurance is still pending.'),
    dict(kicker='Step 1 · listing', title='Open the apartment listing.', body='The realestate.com.au page identifies 102/2 Sam Sing Street, Waterloo. The buyer opens the Chrome side panel.', badge='Address read only on user action', voice='Start on the real apartment listing. The buyer opens the side panel and chooses to read the visible address.'),
    dict(kicker='Step 2 · identity', title='Confirm the exact unit.', body='Microburbs resolves GANSW719665322. The demo source returns one bedroom and no valuation.', badge='Unit facts require an exact match', voice='The Microburbs demo resolves the exact GNAF unit and reports one bedroom. No valuation is available, so none is shown.'),
    dict(kicker='Step 3 · proximity', title='Find nearby planning sites.', body='The checked 903–921 Bourke Street map point is northwest of 2 Sam Sing Street. Distance is straight-line geometry.', badge='Direction is not a daylight forecast', voice='A nearby planning site appears northwest of the building. The direction and distance are geometry, not a prediction of sunlight.'),
    dict(kicker='Step 4 · consent', title='Existing consent · D/2021/1415', body='The official NSW proposal page describes the baseline as six mixed-use buildings with 376 apartments.', badge='Official City of Sydney record linked', voice='The first record is the existing city consent, D slash 2021 slash 1415. The state proposal page describes a baseline of six buildings with 376 apartments.'),
    dict(kicker='Step 5 · proposal', title='Assessment · SSD-95997711', body='The NSW Planning Portal describes an amendment seeking approximately 250 additional apartments.', badge='Proposal is not an approval', voice='The second record is a state proposal, SSD 95997711. It seeks about two hundred and fifty additional apartments. Its current stage is assessment, not approval.'),
    dict(kicker='Step 6 · inspect', title='Take one question to inspection.', body='Do the official planning documents assess shadows at this building, and what do they show for this unit?', badge='Open the official project record', voice='The buyer leaves with one useful question about shadow evidence for this building, and a direct link to the official project record.'),
    dict(kicker='Safe outcomes', title='The panel can abstain.', body='Missing unit, postcode mismatch, partial coverage and API failure each have distinct states. Old listing facts are cleared.', badge='No wrong-unit fact by guesswork', voice='When the address is ambiguous, the panel asks for a correction. Partial coverage and API errors are shown separately, and old listing facts are cleared.'),
    dict(kicker='Held-out check', title='Seven exact. Zero wrong units.', body='Ten independent listing addresses: 7 exact unit matches, 3 safe abstentions, 0 building-only and 0 wrong-unit results.', badge='Browser installation QA pending', voice='The ten address held out check found seven exact unit matches, three safe abstentions, and zero wrong units. The browser installation check remains to be done.'),
]


if __name__ == '__main__':
    build('pitch.mp4', PITCH, False)
    build('demo.mp4', DEMO, True)
