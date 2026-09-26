"""Real job handlers.

Each handler runs the actual work (Pillow image resize, reportlab PDF,
MIME email construction, CSV export) in-memory and returns a short human
summary that the worker stores as `result`.

Handlers are synchronous CPU-bound; the worker calls them via
`asyncio.to_thread(...)` so the event loop stays responsive.
"""
from __future__ import annotations
import io
import random
import secrets
import csv
from datetime import datetime, timezone
from email.message import EmailMessage

from PIL import Image, ImageDraw, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import LETTER


# ---------- Image Resize ---------- #
def _random_image(w: int, h: int) -> Image.Image:
    img = Image.new("RGB", (w, h), (random.randint(60, 220),) * 3)
    draw = ImageDraw.Draw(img)
    for _ in range(6):
        x1, y1 = random.randint(0, w), random.randint(0, h)
        x2, y2 = random.randint(0, w), random.randint(0, h)
        color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        draw.rectangle([min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)], fill=color)
    return img.filter(ImageFilter.SMOOTH)


def do_image_resize(description: str, **_) -> str:
    src_w, src_h = random.choice([(1920, 1080), (2560, 1440), (3840, 2160), (1600, 1200)])
    src = _random_image(src_w, src_h)
    src_buf = io.BytesIO()
    src.save(src_buf, format="PNG", optimize=True)
    src_kb = len(src_buf.getvalue()) / 1024

    target_w = random.choice([320, 480, 640, 800])
    target_h = int(src_h * (target_w / src_w))
    resized = src.resize((target_w, target_h), Image.LANCZOS)
    dst_buf = io.BytesIO()
    resized.save(dst_buf, format="PNG", optimize=True)
    dst_kb = len(dst_buf.getvalue()) / 1024

    reduction = (1 - dst_kb / src_kb) * 100 if src_kb else 0
    return (
        f"Resized {src_w}×{src_h} PNG ({src_kb:.1f} KB) → "
        f"{target_w}×{target_h} ({dst_kb:.1f} KB) · {reduction:.0f}% smaller"
    )


# ---------- PDF Generation ---------- #
_LOREM = (
    "Lorem ipsum dolor sit amet consectetur adipiscing elit. Sed do eiusmod tempor "
    "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud "
    "exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.".split()
)


def _lorem_lines(n: int) -> list[str]:
    return [" ".join(random.sample(_LOREM, k=min(10, len(_LOREM)))) for _ in range(n)]


def do_pdf_generation(description: str, owner_name: str = "User", **_) -> str:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=LETTER)
    width, height = LETTER
    # Cover
    c.setFillColorRGB(0.98, 0.80, 0.08)
    c.rect(0, height - 90, width, 90, fill=1, stroke=0)
    c.setFillColorRGB(0.07, 0.09, 0.15)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(54, height - 60, "QueueFlow — Generated Report")
    c.setFont("Helvetica", 11)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawString(54, height - 120, f"Prepared for: {owner_name}")
    c.drawString(54, height - 138, f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    c.drawString(54, height - 156, f"Description: {description[:90]}")
    y = height - 200
    c.setFont("Helvetica", 10)
    for line in _lorem_lines(28):
        c.drawString(54, y, line)
        y -= 14
        if y < 60:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - 60
    c.showPage()
    c.save()
    data = buf.getvalue()
    return f"Generated PDF · {len(data) / 1024:.1f} KB · Letter size · via reportlab"


# ---------- Send Email (real MIME) ---------- #
def do_send_email(description: str, owner_name: str = "User", **_) -> str:
    to = f"recipient+{secrets.token_hex(3)}@example.com"
    msg = EmailMessage()
    msg["From"] = "QueueFlow <no-reply@queueflow.dev>"
    msg["To"] = to
    msg["Subject"] = f"[QueueFlow] {description[:60]}"
    msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    msg["Message-ID"] = f"<{secrets.token_hex(10)}@queueflow.dev>"
    msg.set_content(
        f"Hi {owner_name},\n\n"
        f"This is an automated update from QueueFlow.\n\n"
        f"Details:\n  {description}\n\n"
        f"Cheers,\nThe QueueFlow bot"
    )
    raw = bytes(msg)
    return f"Composed RFC-822 email to {to} · {len(raw)} bytes · Message-ID {msg['Message-ID']}"


# ---------- Data Export (real CSV) ---------- #
def do_data_export(description: str, owner_name: str = "User", **_) -> str:
    rows = random.randint(120, 2400)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["id", "owner", "event", "value", "timestamp"])
    now = datetime.now(timezone.utc).isoformat()
    for i in range(rows):
        w.writerow([i, owner_name, random.choice(["click", "view", "signup", "purchase"]),
                    round(random.uniform(0.1, 999.9), 2), now])
    data = buf.getvalue().encode("utf-8")
    return f"Exported {rows:,} rows to CSV · {len(data) / 1024:.1f} KB · UTF-8"


HANDLERS = {
    "image_resize": do_image_resize,
    "pdf_generation": do_pdf_generation,
    "send_email": do_send_email,
    "data_export": do_data_export,
}


def run_handler(job_type: str, description: str, owner_name: str) -> str:
    fn = HANDLERS.get(job_type)
    if fn is None:
        return f"Processed job of unknown type '{job_type}'."
    return fn(description=description, owner_name=owner_name)
