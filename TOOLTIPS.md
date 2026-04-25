# Tooltips

Tooltip copy for the most important Swiss Grid Generator workflows.

These topics feed the in-app layout tooltip popup shown at the bottom of the preview when a layout is loaded. The popup presents one topic at a time and can be stepped forward with `Next >`.

Format:
- `## Group Title` starts a tooltip group.
- `### Tooltip Topic {#tooltip-id}` starts a top-level tooltip topic.
- Use short paragraphs and focused bullets.
- Keep tips practical, compositional, and action-oriented.
- Prefer explaining the next useful move over describing every control.

## Working Order

### Start With The Page System {#tooltip-start-with-system}
Set format, baseline, margins, grid, rhythm, type scale, and base font before placing many layers. If the page feels wrong, adjust the system first. Local paragraph fixes are most useful after the grid field is already stable.

### Structure Before Styling {#tooltip-structure-before-styling}
Use `Rows`, `Baselines`, and `Cols` to define the text frame before refining wording, tracking, or color. The frame is the editorial decision. Styling should clarify that decision, not compensate for a weak one.

### Use Repetitive As A Control {#tooltip-repetitive-reference}
Start with `Repetitive` rhythm when judging a layout. It gives the clearest read on whether margins, baseline, and hierarchy are working. Move to Fibonacci, Golden Ratio, Perfect Fourth, or Perfect Fifth only when the structure benefits from asymmetry.

## Creating Content

### Create Text Directly On The Grid {#tooltip-create-text}
Double-click inside a module to create a paragraph exactly where the page structure suggests it belongs. The created block uses the clicked module, so deliberate clicks matter. Place first, refine second.

### Choose Hierarchy While Creating {#tooltip-create-hierarchy}
Hold `1..6` while double-clicking to create a paragraph with the intended hierarchy immediately. Use `1 Caption`, `2 Body`, `3 Subhead`, `4 Headline`, `5 Custom`, and `6 Display`.

### Add Image Placeholders In Place {#tooltip-create-image}
Use `Shift` + double-click on an empty module to create an image placeholder. Image placeholders share the same snap, span, baseline-height, and rotation discipline as text blocks, so they should be placed with the same structural care.

### Use Lorem As A Frame Test {#tooltip-lorem-frame-test}
Insert `<%lorem%>` when you need to test whether a paragraph frame can carry the intended text density. `<%lorem%>` fills the active frame using its current rows, baselines, columns, reflow, and hyphenation settings.

## Moving And Duplicating

### Drag For Placement, Nudge For Decision {#tooltip-drag-and-nudge}
Drag to establish the rough position. Use cursor keys to make controlled placement decisions. Arrow-key nudging uses the same logical placement model as drag, so movement stays tied to the grid instead of becoming arbitrary screen motion.

### Nudge With The Grid {#tooltip-cursor-nudge}
With snapped axes enabled, arrow keys move the selected unlocked layer by columns and module rows. Hold `Shift` while nudging to switch snapped Y movement to baseline rows. On unsnapped axes, `Shift` increases the fine movement step.

### Duplicate Without Losing Rhythm {#tooltip-duplicate-layer}
Use `Alt/Option` + drag to duplicate a paragraph or image placeholder. Hovered text paragraphs also expose a `+` affordance: click copies the full paragraph, `Shift` + click copies `Paragraph` settings, `Alt/Option` + click copies `Typo` settings, and `Alt/Option` + `Shift` + click copies both for transfer onto another paragraph, even across pages and loaded layouts.

### Free Placement Is An Exception {#tooltip-free-placement}
Turn off `Snap to Columns (X)` or `Snap to Baseline (Y)` only when the composition needs a controlled exception. Free X placement allows a disciplined one-column side-margin overhang. It is useful for optical tension, not casual alignment drift.

## Editing Flow

### Smart Text Zoom Keeps The Work Local {#tooltip-smart-text-zoom}
Keep Smart Text Zoom on when editing text-heavy layouts. Entering text edit focuses the active paragraph. Ordinary text and style edits keep the current view stable, while frame-geometry changes refit the paragraph.

### Turbo Edit Paragraph To Paragraph {#tooltip-turbo-edit}
When an editor is open, click another unlocked preview paragraph to retarget the editor immediately. Use this to move through a page paragraph by paragraph without repeatedly closing and reopening edit mode.

### Turbo Edit From Layer Cards {#tooltip-layer-card-retarget}
Double-click an unlocked layer card in the Project panel to open or retarget the corresponding text or image editor. Single-click still only selects the layer, which keeps keyboard nudging available without accidentally entering edit mode.

### Edit The Rendered Text, Not A Generic Textarea {#tooltip-rendered-text-editing}
Inside inline text edit, cursor movement follows the rendered line layout. Double-click selects a word, triple-click selects a sentence, and `Alt+A` or `Cmd/Ctrl+A` selects the whole paragraph.

### Keep Placeholders Visible While Editing {#tooltip-placeholder-editing}
Document variables stay visible as raw tokens while editing, then render as live values outside edit mode. Use this to place folios, project titles, dates, times, and proof text with predictable editorial control.

## Paragraph Geometry

### Frame Height Is Rows Plus Baselines {#tooltip-rows-plus-baselines}
Paragraph and image heights are built from `rows + baselines`. Use full rows for modular blocks and baseline-only height for shallow editorial frames, captions, folios, and proof lines.

### Set Columns Before Reflow {#tooltip-columns-before-reflow}
Choose `Cols` before judging paragraph flow. A weak line length is usually a frame problem. Reflow and hyphenation work best after the column span is structurally correct.

### Align Inside The Frame {#tooltip-frame-alignment}
Horizontal and vertical alignment position text inside the configured paragraph frame. Use alignment to make a compositional decision within a clear frame, not to repair a poorly placed frame.

### Use Custom Type Deliberately {#tooltip-custom-type}
When first selected, `Custom` copies the paragraph's resolved size and leading. Treat Custom as a local editorial exception after the hierarchy is clear.

## Layers And Pages

### Select Before Nudging {#tooltip-select-before-nudge}
Single-click a layer card to select it, then use arrow keys to nudge it. This keeps placement changes precise and avoids entering edit mode when you only need a positional adjustment.

### Lock Finished Layers {#tooltip-lock-finished-layers}
Lock layers once their position and role are resolved. Locked layers stay visible but cannot be hovered, moved, edited, or retargeted until unlocked, which protects stable structure during later edits.

### Use Page Cards For Document Rhythm {#tooltip-page-cards}
Use page cards to activate, rename, reorder, and inspect pages. Page order is part of the design. Treat it with the same discipline as grid and type hierarchy.

### Use Facing Pages Only For Real Spreads {#tooltip-facing-pages}
Use `Facing pages` when two physical pages need one continuous editorial field. A facing spread remains one project page, doubles the effective column field, mirrors inner and outer margins, and affects physical page variables.

## Preview Discipline

### Toggle Guides While Judging {#tooltip-preview-guides}
Use the header toggles to inspect baselines, margins, modules, typography, and image placeholders. Judge the same layout both with and without guides. A strong layout should keep its rhythm after the construction lines disappear.

### Rollover Guides Show The Frame {#tooltip-rollover-guides}
Hover a layer to see its edit access and placement guides. Paragraph guides follow the configured `rows + baselines` frame, not only the visible text bounds.

### Help Hover Is Contextual {#tooltip-help-hover}
Open Help, then hover blue-marked UI areas to jump the Help panel to the matching reference. This works for header actions, settings sections, the preview surface, editor sections, and the preset browser.

## Export Readiness

### Export Only After The System Is Stable {#tooltip-export-readiness}
Export should confirm a resolved layout, not repair it. Before exporting, check page order, page range, visible guide toggles, rotation, page numbering, and document variables.

### Pick Export By Downstream Use {#tooltip-export-format}
Use `PDF` for faithful vector output, `SVG` for frozen per-page vector geometry, and `IDML` for InDesign continuation. SVG and IDML freeze typography as geometry, so choose them when exact shape fidelity matters more than live text editing.

### WYSIWYG Includes The Visible Overlays {#tooltip-export-visibility}
Export follows the current preview visibility state for baselines, margins, modules, typography, and image placeholders. Turn off construction guides before final output unless they are intentionally part of the deliverable.

## Common Corrections

### If The Page Feels Loose {#tooltip-fix-loose-page}
Return to baseline, margins, and grid rhythm before editing individual paragraphs. Most loose layouts need a clearer field, not more local styling.

### If Text Feels Weak {#tooltip-fix-weak-type}
Check hierarchy, frame width, leading, and baseline alignment before changing tracking. Tracking changes the color of the paragraph. It should refine type texture, not replace hierarchy.

### If Content Falls Out Of Bounds {#tooltip-grid-reduction}
Grid reductions are blocked when existing layers would fall outside the new field. Resolve the layer placement first, then reduce rows or columns. The tool protects composition by refusing silent repositioning.

### If Editing Feels Slow {#tooltip-faster-editing}
Use Smart Text Zoom, open one editor, then retarget from paragraph to paragraph or layer card to layer card. The fastest workflow is not many commands. It is staying in context while moving through the page deliberately.
