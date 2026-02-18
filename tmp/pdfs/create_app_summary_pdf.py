from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

OUT = "output/pdf/swiss-grid-generator-summary.pdf"

PAGE_W, PAGE_H = letter
MARGIN = 42
MAX_W = PAGE_W - (MARGIN * 2)

TITLE_SIZE = 16
HEAD_SIZE = 11
BODY_SIZE = 9
LEAD_SIZE = 10
LINE = 12


def wrap(text, font, size, max_w):
    words = text.split()
    lines = []
    cur = ""
    for w in words:
        cand = w if not cur else f"{cur} {w}"
        if stringWidth(cand, font, size) <= max_w:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_lines(c, lines, x, y, font="Helvetica", size=BODY_SIZE, line_h=LINE):
    c.setFont(font, size)
    for ln in lines:
        c.drawString(x, y, ln)
        y -= line_h
    return y


def draw_heading(c, text, y):
    c.setFont("Helvetica-Bold", HEAD_SIZE)
    c.drawString(MARGIN, y, text)
    return y - 15


def draw_bullet(c, text, y):
    bullet_x = MARGIN + 2
    text_x = MARGIN + 12
    c.setFont("Helvetica", BODY_SIZE)
    lines = wrap(text, "Helvetica", BODY_SIZE, MAX_W - 12)
    if not lines:
        return y
    c.drawString(bullet_x, y, "-")
    c.drawString(text_x, y, lines[0])
    y -= LINE
    for ln in lines[1:]:
        c.drawString(text_x, y, ln)
        y -= LINE
    return y


def build():
    c = canvas.Canvas(OUT, pagesize=letter)
    y = PAGE_H - MARGIN

    c.setFont("Helvetica-Bold", TITLE_SIZE)
    c.drawString(MARGIN, y, "Swiss Grid Generator - One-Page App Summary")
    y -= 18

    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, y, "Repo: /Users/i/Docs/Dev/swiss-grid-generator")
    y -= 18

    y = draw_heading(c, "What it is", y)
    intro = (
        "Swiss Grid Generator is a Next.js web app for building ratio-first typographic grids, "
        "editing baseline-aligned text layouts, and exporting vector PDFs. "
        "It combines grid setup, interactive preview editing, and print-oriented export in one interface."
    )
    y = draw_lines(c, wrap(intro, "Helvetica", LEAD_SIZE, MAX_W), MARGIN, y, size=LEAD_SIZE, line_h=13)
    y -= 4

    y = draw_heading(c, "Who it is for", y)
    y = draw_bullet(c, "Primary user/persona: Not found in repo.", y)
    y = draw_bullet(c, "Inferred from features/docs: designers and typographers creating modular editorial layouts.", y)
    y -= 4

    y = draw_heading(c, "What it does", y)
    features = [
        "Builds configurable grids across ratio families (DIN/ANSI and custom ratios) with orientation and rotation controls.",
        "Calculates margins, baselines, modules, and typographic scales from shared grid settings.",
        "Supports drag/snap preview editing, inline text editing, per-block spans/rotation, and optional text reflow/syllable division.",
        "Tracks UI/layout history with undo/redo, including structural reflow apply/cancel flows.",
        "Loads and saves full layout state as JSON (uiSettings + previewLayout + gridResult metadata).",
        "Exports vector PDF output through jsPDF with optional print-pro settings (bleed, crop marks, guide behavior).",
    ]
    for item in features:
        y = draw_bullet(c, item, y)
    y -= 4

    y = draw_heading(c, "How it works (repo-evidenced architecture)", y)
    arch = [
        "UI layer: React client page coordinates state and panels in webapp/app/page.tsx and webapp/components/*.",
        "Core services: grid math in webapp/lib/grid-calculator.ts; text wrapping/optical margin in webapp/lib/text-layout.ts and webapp/lib/optical-margin.ts.",
        "Background compute: reflow and autofit run in Web Workers (webapp/workers/reflowPlanner.worker.ts, webapp/workers/autoFit.worker.ts) via useWorkerBridge with in-thread fallback.",
        "Data flow: UI settings -> generateSwissGrid result -> GridPreview rendering -> optional worker reflow/autofit updates -> JSON save/load in browser.",
        "Export path: useExportActions calls renderSwissGridVectorPdf (webapp/lib/pdf-vector-export.ts) to write vector primitives through jsPDF.",
        "Backend/services: core app API/service dependency is Not found in repo; optional survey files exist under webapp/public/survey/.",
    ]
    for item in arch:
        y = draw_bullet(c, item, y)
    y -= 4

    y = draw_heading(c, "How to run (minimal)", y)
    steps = [
        "From repo root: cd webapp",
        "Install deps: npm install",
        "Start dev server: npm run dev",
        "Open http://localhost:3000",
    ]
    for i, step in enumerate(steps, 1):
        y = draw_bullet(c, f"{i}. {step}", y)

    if y < MARGIN:
        c.setFont("Helvetica-Bold", 8)
        c.drawString(MARGIN, MARGIN - 8, "Warning: content may overflow page.")

    c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
