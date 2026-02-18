# Rendering Logic

## Purpose
This document describes the current text rendering behavior of the Swiss Grid Generator, including:
- Canvas rendering pipeline
- Block layout decisions
- Reflow modes (`off`, `on + 1 col`, `on + >1 cols`)
- Overflow detection and badge rendering
- Drag/drop behavior and user setting preservation

## Rendering Pipeline
Rendering is split across three canvas layers in `webapp/components/grid-preview.tsx`:

1. Static guides canvas (`staticCanvasRef`)
- Drawn by `renderStaticGuides(...)`
- Renders margins, modules, baselines

2. Typography canvas (`canvasRef`)
- Drawn by `useTypographyRenderer(...)` in `webapp/hooks/useTypographyRenderer.ts`
- Renders all text blocks (display/headline/subhead/body/caption/custom)
- Uses an offscreen typography buffer canvas and then blits to the visible canvas
- Current implementation does a full redraw each frame to avoid stale text artifacts

3. Overlay canvas (`overlayCanvasRef`)
- Draws drag snap indicator line
- Draws overflow badge (red circle with ellipsis) for blocks with `overflowLines > 0`

## Core Block Inputs
For each block key:
- Text: `textContent[key]`
- Style: `styleAssignments[key]`
- Position: `blockModulePositions[key]`
- Column span: `blockColumnSpans[key]`
- Row span: `blockRowSpans[key]`
- Reflow toggle: `blockTextReflow[key]`
- Syllable division toggle: `blockSyllableDivision[key]`
- Alignment: `blockTextAlignments[key]`

## Reflow Switch (Single Source of Truth)
Reflow is controlled only by the block reflow toggle:
- `isTextReflowEnabled(key)` checks `blockTextReflow[key]` first
- If a value is stored, `true` means ON and `false` means OFF
- Default behavior for base blocks:
  - `body`, `caption`: reflow defaults to ON when no explicit value is stored
  - other blocks (`display`, `headline`, `subhead`, custom): default OFF unless explicitly enabled

This logic lives in `webapp/components/grid-preview.tsx`.

## Text Rendering Modes
Implementation is in `webapp/hooks/useTypographyRenderer.ts`.

### Mode A: Reflow OFF
Condition:
- `reflowEnabled === false`

Behavior:
- Text wraps to full block width (`wrapWidth`, i.e. span width including gutters)
- No newspaper column flow
- Lines are rendered top-down as normal wrapped paragraph lines
- Rendering is bounded by page bottom
- `overflowLines = 0` in this mode (no reflow-overflow semantics)

### Mode B: Reflow ON + 1 Column
Condition:
- `reflowEnabled === true` and `span === 1`

Behavior:
- Text wraps to single module width
- Vertical flow from top to bottom through module bands in the same column
- Vertical gutter bands are skipped (no text is rendered inside vertical gutters)
- Uses available vertical space until document content bottom
- No horizontal spill into extra columns
- If remaining lines do not fit by document bottom, those lines count as overflow

Overflow rule:
- `overflowLines = totalWrappedLines - renderedLines`
- If `overflowLines > 0`, overflow badge is shown

### Mode C: Reflow ON + More Than 1 Column
Condition:
- `reflowEnabled === true` and `span >= 2`

Behavior:
- Text wraps to single column width (`module width`)
- Newspaper flow within configured span:
  - Column 1 top -> bottom
  - Column 2 top -> bottom
  - ...
  - Last column top -> bottom
- No virtual extra columns beyond configured span

Overflow rule:
- Any remaining wrapped lines after the last usable slot in the last column are overflow
- `overflowLines = totalWrappedLines - renderedLines`
- If `overflowLines > 0`, overflow badge is shown

## Overflow Badge Rendering
Badge drawing is in overlay effect in `webapp/components/grid-preview.tsx`.

Rule:
- For each block: if `overflowLinesByBlock[key] > 0`, draw badge in bottom-right of that block rect

Visual:
- Red filled circle (`rgba(255, 80, 80, 0.85)`)
- White ellipsis

Position:
- Uses block rectangle from `blockRectsRef`
- Anchored inside bottom-right with fixed radius and padding

## Overflow Data Flow
1. `useTypographyRenderer` computes `overflowByBlock` while generating draw commands
2. It calls `onOverflowLinesChange(overflowByBlock)`
3. `GridPreview` stores state in `overflowLinesByBlock`
4. Overlay canvas reads that state and renders badges

## Drag and Drop Behavior (User Settings Preservation)
The drag/drop behavior is in `applyDragDrop(...)` inside `webapp/components/grid-preview.tsx`.

Current rule:
- Dragging a block changes only position
- Dragging does not auto-change column span
- Copy-on-drop duplicates block settings and preserves source span

This prevents unwanted column-span mutation (e.g. 1 col becoming 2 cols automatically).

## Editor Save Behavior
Editor save logic is in `webapp/hooks/useBlockEditorActions.ts`.

Current rule:
- `draftColumns` chosen by user is persisted directly
- AutoFit no longer overwrites user-selected column span during save

## Worker Responsibilities
Workers do not perform canvas text rendering.

### `reflowPlanner.worker.ts`
- Computes structural placement/reflow plan:
  - `resolvedSpans`
  - `nextPositions`
  - `movedCount`
- Returns message contract payload used by reflow flow

### `autoFit.worker.ts`
- Computes optional span/position suggestions for autofit workflows
- Not used to silently override drag-drop user span decisions

## Artifact Handling
To eliminate stale text artifacts when blocks shrink/move/reflow:
- Typography buffer now does full clear + redraw for current plans each frame
- This avoids partial-dirty-region edge cases where old glyphs could remain visible

## Practical Summary
- Reflow OFF: normal wrapped block text
- Reflow ON + 1 col: vertical single-column flow until document bottom
- Reflow ON + >1 cols: newspaper flow across configured columns
- Overflow badge: only when text cannot fit in active reflow mode
- Drag/drop and editor save do not auto-overwrite user column settings
