```
i was looking for swiss design grid generators online. could not find happening ones.
 
so i build this in the spirit/logic and the calulations of this book: Mueller-Brockmann_Josef_Grid_Systems_in_Graphic_Design_Raster_Systeme_fuer_die_Visuele_Gestaltung_English_German_no_OCR.pdf
 
online: https://dev.lp45.net/swiss-grid-generator/
source code: https://github.com/longplay45/swiss-grid-generator
 
what do you think?
```
That's a really nice piece of work—congratulations on building and releasing it!

The Swiss/international typographic style (and Müller-Brockmann's book in particular) still has a dedicated following in 2026, especially among people who value precision, clarity, and historical rigor in layout work. Yet truly faithful online generators that go beyond basic 12/16-column web grids are surprisingly rare. Most "grid tools" out there lean toward responsive web (960.gs derivatives, Bootstrap-style calculators) or general-purpose ones like the Ultimate Grid Generator or older ones like gridcalculator.dk. Very few dig deeply into the actual modular + baseline logic from *Grid Systems in Graphic Design*—progressive margins, baseline-derived gutters, module aspect ratios tied to type leading, etc. So yes, there was a real gap, and you've filled a niche with something that feels authentic to the source material.

### What I particularly like about it
- **Fidelity to the book** — From the calculations (progressive 1:2:2:3 margins as default, baseline grid driving everything, module height in multiples of the baseline), it looks like you really implemented the spirit of those A4 examples and the margin/gutter relationships Müller-Brockmann shows. The separate margin modes (progressive, Van de Graaf, equal) and override multipliers are excellent touches—very true to how Swiss designers would experiment while staying systematic.
- **Baseline-grid-first approach** — Starting from a chosen baseline (12 pt default for A4 feels period-correct), then deriving gutters and modules from it, is spot-on for typographic work. Many modern tools ignore or fake the vertical rhythm.
- **Typography integration** — Offering hand-tuned Swiss-style scale (with options like Golden Ratio, Fibonacci, musical intervals) aligned to the baseline is thoughtful. That's exactly what the book encourages for hierarchy without arbitrariness.
- **Interactive preview** — The canvas with toggleable layers, inline text editing (double-click!), rotation support, and column-aware flow makes it actually useful for sketching ideas, not just calculating numbers.
- **Exports** — PDF (via jsPDF), JSON, TXT gives real workflow value. Print designers can drop the PDF straight into InDesign/Illustrator as a template/guide layer; digital folks can import the JSON specs.
- **Tech choices** — Next.js + TypeScript + Tailwind + Radix feels clean and maintainable. Canvas-based preview is performant enough for this use case.

### Minor thoughts/suggestions (if you're iterating)
- **Mobile/responsiveness** — The tool is print-rooted (A-series, pt units), which is correct for its inspiration, but a small responsive demo mode (showing how the same grid adapts to viewport with container queries or something) could attract more web-curious Swiss-style fans.
- **More paper formats** — You already support A0–A6 + portrait/landscape. Adding common digital formats (e.g. 1920×1080 px artboard, 16:9 slide) as presets could broaden appeal without betraying the print origins.
- **Baseline preview density** — On smaller screens the baseline grid might feel crowded; a quick toggle for "show every 2nd/4th baseline" could help.
- **Discoverability** — Since it's new/zero stars right now, maybe add a few example screenshots or generated PDFs in the README showing classic Müller-Brockmann-style layouts built with it. That would help it show up better when people search for "Müller-Brockmann grid generator" or similar.

Overall, this is one of the more serious and principled grid tools I've seen in the browser—most are either too simplistic or too web/CSS-focused. If you're into the austere beauty of Swiss design, this feels like a love letter to the book rather than a generic calculator. Well done.

If you keep polishing it (and maybe share it on design forums, Reddit r/graphic_design, Swiss posters groups, etc.), I can easily see it becoming a small go-to reference for people studying or applying those principles today. What's your next step with it—more features, or just letting it live as a helpful open-source tool?

```
next step could be building a native macos app for the appstore to make "some" money with it? so the web app could be just the proof of concept write now... what do you think?
```

Building a native macOS app for the App Store is a reasonable next step if your goal is to monetize the tool and reach a more professional/niche audience, but it's **not a slam-dunk path to "some" meaningful money** — at least not without realistic expectations and extra effort. Here's a balanced take based on where things stand in early 2026.

### The positives — why it could make sense
- **Niche but passionate audience** — Swiss/Müller-Brockmann-style grid systems remain a staple in graphic design education, print/poster work, branding agencies that value historical rigor, and even some web folks experimenting with brutalist or neo-Swiss aesthetics. Students, lecturers, independent designers, and small studios still reference the book heavily. Your web version already shows thoughtful fidelity to the source material, which is rare — most grid tools are either too generic or web/CSS-focused.
- **Native macOS advantages** → Designers on Mac (still the majority in serious graphic/print work) love native apps: better performance for canvas rendering, full offline use, tighter integration with macOS features (e.g., drag-and-drop to InDesign/Illustrator, system color picker, Quick Look previews for exported PDFs/JSON, native file associations, menu bar extras, Shortcuts support, maybe Apple Pencil on iPad later via Catalyst or universal binary). You could also add drag-to-export guides or copy-paste grid specs directly into other apps.
- **Monetization options that fit the niche**:
  - One-time purchase: $9.99–$19.99 feels right for a focused utility (many design tools like good old grid calculators or InDesign plugins live in this range).
  - Freemium: free basic version (like your web app), paid unlocks for advanced exports, more paper sizes, custom type scales, batch PDF generation, or pro templates.
  - In-app purchases for extras (e.g., historical Swiss poster templates, more type families presets).
- **Low competition in desktop space** — From current searches, there's basically nothing: no dedicated Swiss/Müller-Brockmann grid generator as a native Mac app. People still manually build these in Illustrator/InDesign or use old scripts/plugins. Your tool could fill that exact gap for print-focused users who prefer desktop over browser.
- **Proof-of-concept leverage** → The web app is already live → you can point App Store description/screenshots to it as "try before buy," use it for user feedback, and port large parts of the logic (especially if you built it in something cross-platform friendly like TypeScript + Canvas; SwiftUI + WebView hybrid or even Electron → native rewrite are options, but pure Swift/SwiftUI would feel best).

### The realistic downsides and risks
- **Small total addressable market** — This isn't Figma/Sketch territory (huge UI/UX demand). It's a hyper-niche utility inside the already-niche print/typographic design world. Global graphic design software market is growing (projected ~$17–18B by early 2030s), but utilities like this are a tiny sliver — think hundreds to low thousands of potential paying users, not tens of thousands.
- **App Store discoverability is tough for niche tools** → Without marketing, even good apps get buried. You'd need:
  - Strong keywords ("Swiss grid", "Müller-Brockmann", "baseline grid generator", "typographic grid", "international style layout").
  - Nice icon + screenshots showing real poster/magazine mockups built with it.
  - Reviews from design educators/influencers early on.
  - Promotion on Reddit (r/graphic_design, r/SwissDesign, r/typography), Behance, Dribbble, Swiss poster groups, design Twitter/X, maybe a Gumroad landing page first to test paid interest.
- **Revenue expectations** → "Some" money is possible (a few hundred to a few thousand $/month if it catches on in schools/agencies), but don't expect life-changing income without virality or bundling. Compare to similar utilities: many Mac design helpers (e.g., color pickers, measure tools, old grid plugins) do $500–$5k/month at best after years, often less. One-time purchase means revenue is front-loaded unless you add updates/expansions.
- **Development effort** → Porting from web (Next.js/Canvas) to native isn't trivial:
  - Swift/SwiftUI for best feel (but learning curve if you're JS-heavy).
  - Or Catalyst (iOS → macOS) if you rebuild parts in SwiftUI.
  - Or keep core logic in WebView but wrap in native shell (easier, but feels less premium).
  - Plus App Store compliance, sandboxing, notarization, review process (~1–4 weeks first time), 30% cut to Apple.

### My recommendation — staged approach
1. **Validate demand cheaply first** (next 1–3 months):
   - Add a prominent "Desktop app coming — sign up for waitlist" form on your site (use ConvertKit/Mailchimp).
   - Offer a Gumroad "pay what you want" PDF export pack or premium JSON templates to gauge willingness to pay.
   - Post on relevant forums/Reddit/X asking "Would you pay $15 for a native Mac Swiss grid app with offline export to InDesign guides?"
   - Track how many serious inquiries you get.

2. **If validation looks good** → go for the Mac app as v2.0:
   - Aim for one-time $14.99 or so.
   - Add killer native features: export .grd/.atn presets for Photoshop/Illustrator, live sync with external type foundries, Apple Silicon optimizations, dark mode perfection.
   - Keep the web version free/updated as marketing funnel + "lite" version.

3. **If validation is lukewarm** → probably better to:
   - Double down on web: add more features (responsive previews, Figma plugin export, shareable links).
   - Consider open-source sponsorships (GitHub Sponsors), donations, or a Patreon for "pro" web features.
   - Or build InDesign/Illustrator plugins/extensions (smaller effort, direct to pros).

Bottom line: it's a solid, low-risk experiment if you treat the Mac app as an extension/enhancement rather than a full pivot. The web version already proves the concept beautifully — monetizing via native could work modestly for a passionate niche, especially if you enjoy the build process and want to own the "Swiss grid bible" tool in desktop form.

What do you think your realistic target revenue looks like ("some" = $500/month? $2k?), and how much time are you willing to invest in the port? That would help narrow whether it's worth it.

```
well $500 per month would be great. a lot (40%?) of the work is already done. what if you think of monetization just the web app with no native app? maybe pro features for paying customers/doners?
```

Yes, shifting focus to monetizing the **web app directly** (keeping it as the main product) is a smart, lower-risk move right now—especially since ~40% of the heavy lifting (core logic, UI, canvas preview, calculations faithful to Müller-Brockmann) is already done. You avoid the porting effort, App Store fees/review hurdles, and the tiny-but-real risk of native discoverability issues. Many niche design utilities thrive purely in the browser, and your tool's print/typographic roots make it less dependent on native perks than, say, a heavy video editor.

$500/month recurring (or equivalent in one-time/donations) is a realistic, achievable target for a polished niche tool like this **without massive marketing**. It's modest enough that you don't need viral growth or thousands of users—just steady value to a passionate subset of graphic design/typography folks (students, educators, indie print designers, Swiss-style enthusiasts). Here's why it fits and how to structure it.

### Why freemium/pro features on the web makes sense here
- **Low overhead** → No native dev, just iterate on what you have (Next.js stack is perfect for this). Add Stripe/Paddle/Lemon Squeezy for payments in a weekend.
- **Proven in similar niches** → Tools like logo grid generators (e.g., some now $39 one-time after free trials), icon packs (~$2k–$6k/month MRR in small design startups), or advanced grid helpers often use freemium/one-time unlocks. Broader design SaaS (Webflow, Canva-inspired) scaled via free → paid upgrades, but even tiny ones hit low-four-figures with targeted audiences.
- **Your audience profile** → People who care deeply about baseline grids, progressive margins, and authentic Swiss logic are often pros/students willing to pay $5–$15/month or $29–$49 one-time for "pro" if it saves real time or unlocks workflow wins. Conversion doesn't need to be huge: 50–100 paying users at $5–$10/month gets you to $500+.
- **Web advantages** → Instant updates, shareable links (e.g., "share this grid setup"), SEO potential ("Müller-Brockmann grid generator"), easy embeds in portfolios/forums.

### Suggested monetization tiers (freemium core)
Keep the current web app **free forever** as the hook—full fidelity to the book, basic exports (PDF/JSON/TXT), previews. This builds traffic, feedback, backlinks, and goodwill (crucial for niche tools).

**Pro tier** ($4.99–$9.99/month or $49–$79/year; maybe $39–$59 one-time "lifetime" option to test demand):
- Unlimited / higher-res PDF exports (e.g., vector-sharp at any scale, bleed/crop marks, multiple pages).
- Advanced exports: InDesign/Illustrator-compatible guides (.idml snippet, .ait template, or copy-paste specs), Figma/Adobe XD import JSON, SVG grid overlay.
- More presets/templates: Historical Swiss poster examples (e.g., replicated grids from the book), custom paper sizes beyond A-series (e.g., US Letter, 16:9 digital, Instagram square), saved projects with cloud sync (simple localStorage + optional account).
- Priority features: Batch generation (multiple grid variants), rotation snapping, more type scale algorithms, custom baseline overrides per module.
- Ad-free (if you ever add light sponsorships), priority support, early access to updates.
- Bonus: "Pro badge" for shared links or embeddable watermarked previews.

**Donations / one-off** (via Buy Me a Coffee, GitHub Sponsors, or Ko-fi):
- $5–$20 "support the project" unlocks a thank-you PDF pack or early feature.
- Good for testing: Many open-source-ish design tools pull $200–$800/month this way from grateful users.

**Implementation tips**
- Use Stripe Checkout or Paddle for global payments (handles taxes/VAT).
- Gate features client-side first (e.g., via simple auth token after payment) to avoid backend rewrite.
- Analytics: Add PostHog or Plausible + a waitlist form ("Unlock pro → sign up") to track interest.
- Pricing test: Start at $7/month or $49/year; A/B test with a landing page variant. Lifetime at $59 could convert well for print folks who hate subs.
- Launch quietly: Update README/site with "Pro coming soon" teaser, post on r/graphic_design, r/typography, Swiss design Discords/Forums, Behance comments, X with #SwissDesign #Typography. Share example outputs (e.g., "Built this poster grid in 5 mins").

### Realistic path to $500/month
- Month 1–2: Add paywall skeleton + 2–3 killer pro features. Promote organically → aim for 1k–3k monthly visitors (feasible with good SEO + shares).
- Conversion: 1–3% of engaged users → 20–50 signups at launch if you hit the right communities.
- Retention: High for utilities like this (people return for projects); aim 70–80% monthly.
- Growth: Add features quarterly (e.g., responsive web preview mode) to justify renewals.

If it plateaus below target, you can always pivot to native later with proven demand (and use web revenue to fund the port).

This keeps momentum on what you already built beautifully, minimizes new risk, and aligns with how most niche design tools monetize in 2026 (freemium + targeted unlocks > big native bet). If you share rough visitor stats or user feedback so far, I can refine the feature ideas further—what do you think of starting with those pro exports as the main unlock?


