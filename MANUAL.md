# Swiss Grid Generator Manual

## Swiss Grid Generator

### User Manual

Swiss Grid Generator is a layout tool for building disciplined editorial pages from ratio, baseline, margins, modules, and typographic hierarchy.

This manual is selective by design. It focuses on the decisions that shape the page. It does not attempt to document every control in the interface.

For implementation-accurate reference, see [SETTINGS.md](./SETTINGS.md), [CALCULATIONS.md](./CALCULATIONS.md), and [FEATURES.md](./FEATURES.md).

## 1. Introduction

### Start with structure, not decoration.

A strong page usually comes from the right order of decisions: set the format, set the baseline, set the margins, build the grid, define the type system, place text and image areas, and export when the composition is stable.

The tool works best when global decisions are made first and local overrides are kept rare. If the structure is clear, later adjustments stay precise. If the structure is weak, every local correction becomes expensive.

## 2. Quick Start

### Build the page in the simplest reliable order.

Choose `Ratio`, `Orientation`, and, if needed, `Rotation`. Then set the `Baseline`, choose the `Margins` method, and adjust the `Baseline Multiple` until the content field feels proportionate. After that, set `Cols`, `Rows`, `Gutter`, and `Rhythm`, then define the document type scale and base font in `Typo & Rhythms`.

Only after the page structure is established should you create content. Double-click a module to create a text paragraph. Use `Shift` + double-click to create an image placeholder. If the page feels wrong, return to baseline and margins before changing the content blocks.

## 3. Recommended Workflow

### Move from the largest decision to the smallest.

The recommended sequence is simple: format and orientation first, baseline second, margins third, grid and rhythm fourth, type scale and base font fifth, paragraph and image placement sixth, local refinements seventh, and export last.

This order matters because the tool is system-driven. If a document needs many local exceptions, the underlying grid, margin field, or type hierarchy is usually not resolved yet. In most cases, the correct fix is structural, not local.

## 4. Pages and Document Structure

### Treat page order as part of the design.

Use single pages when each page should stand on its own. Use `Facing Pages` when a spread should behave as one editorial field. A facing spread is one project page, but it represents two physical pages. That matters for page numbering and for document variables such as `%page%` and `%pages%`.

In the Project panel, activate pages directly from the page cards and open a page card when you need to inspect or edit its layers. Use the small `i` toggle only when you need the document info text. Add pages where they belong in the reading sequence. Facing pages should be intentional, not a substitute for a weak single-page composition.

## 5. Grid, Margins, and Rhythm

### Resolve the page field before refining the content.

This is the structural core of the document. Choose a baseline that matches the intended density of the work. A smaller baseline creates finer rhythm and more control. A larger baseline creates a slower page. Then choose a margin system that defines a clear content field. If the page feels unstable, the solution is often in the margins.

Only after that should you define columns, rows, gutter, and rhythm. Use `Repetitive` as the neutral reference. If the page does not work there, a more expressive rhythm will rarely solve it. Use Fibonacci, Golden Ratio, Perfect Fourth, and Perfect Fifth only when they strengthen the structure.

## 6. Typography

### Let type reinforce the grid.

Start by setting the document type scale and the base font. Then assign hierarchy by role: caption, body, subhead, headline, fx/custom, and display. These levels are structural roles, not mood presets.

Refine tracking and leading only after the hierarchy is correct. Tracking changes the tonal color of the page and should be used carefully. Alignment and vertical alignment should be compositional decisions, not repair tools. Variables such as `%page%`, `%pages%`, `%date%`, and `%lorem%` belong to the editorial logic of the page.

## 7. Placing Text and Image Areas

### Define the frame before refining the content.

Use the modular field deliberately. Double-click a module to create text with hyphenation off. Hold `1` to `5` while double-clicking to create text directly in a hierarchy; the initial frame follows that role and clamps to the remaining columns. Use `Shift` + double-click to create an image placeholder.

Before refining wording, define the frame with `Rows`, `Baselines`, and `Cols`. Then adjust alignment, snapping, and content. Snapped placement produces stronger editorial discipline. Free placement should be deliberate. If a frame feels too loose, reduce the geometry before adjusting the text inside it.

## 8. Export

### Export is translation, not correction.

Choose the export format according to what happens next. Use `PDF` for faithful vector document output, `SVG` for frozen vector geometry per page, and `IDML` when the document continues in InDesign. The export choice should serve the downstream workflow, not convenience in the moment.

Before exporting, confirm the selected page range, the page order, the page numbering, the document size, and the output of editorial variables. On long documents or rotated pages, always make a visual check after export. Export should confirm a resolved layout, not compensate for an unresolved one.

## 9. Keyboard and Fast Interaction

### Use shortcuts to protect concentration.

Only a few interactions materially improve the workflow: double-click to create text, `Shift` + double-click to create an image placeholder, hold `1` to `5` while double-clicking to choose hierarchy directly, drag to move, `Alt/Option` + drag to duplicate, use arrow keys to nudge selected layers, and press `Esc` to leave dialogs or cancel export at the next safe point.

The purpose of shortcuts is not speed for its own sake. The purpose is to keep attention on the page. Keep the interaction set small, predictable, and compositional.

## 10. Common Mistakes

### Most layout problems begin too locally.

One common mistake is styling paragraphs too early. If the grid is unresolved, local text styling will only hide the problem. Another is using facing pages without a real spread logic. Facing pages are useful when the spread must work as one field. Otherwise, single pages are stronger.

Other common errors follow the same pattern. Designers often overfill the grid when the stronger correction would be a better margin field or clearer type hierarchy. They try to repair weak hierarchy with tracking alone, even though tracking cannot replace a clear scale and role structure. They also export without checking numbering and page range. Return to the system first.

## 11. Final Advice

### Keep the system clear and the exceptions rare.

Set the page before the content. Set the rhythm before the styling. Set the frame before the wording. Set the system before the exceptions. This is the central discipline of the tool.

If the layout is structurally clear, the tool becomes fast. If the structure is unclear, every later adjustment becomes slower, heavier, and less precise. The manual should always be read in that spirit.
