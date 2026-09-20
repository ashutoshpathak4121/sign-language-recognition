# Design

**Project:** Sign Language Detection
**Last updated:** 2026-09-20

This document defines how the interface looks, reads, and behaves. Build the interface from these tokens and rules. Product goals are in PRD.md.

---

## 1. Subject, audience, and job

- **Subject:** recognising hand signs (ASL alphabet) in a photo or live camera feed.
- **Audience:** sign language learners, teachers, parents, and curious visitors. Some are Deaf or hard of hearing, and some have low vision or limited hand mobility. Many will be on a phone.
- **Primary job:** let a person show a sign and immediately see what the model read, and how sure it is.
- **Tone:** clear, calm, and encouraging. The tool is a practice partner, not a judge.

## 2. Design idea

The one memorable thing is **the detection frame**. Every object detector draws a box with a label tab on a hand. We make that box the identity of the site. The media stage has four corner brackets in the brand colour, and results appear as a label tab attached to the frame. Everything else stays quiet.

Two decisions came out of reviewing the first draft against the brief:

| First draft | Problem | Change |
|-------------|---------|--------|
| Near-black page with a neon accent | The usual "AI detector" look, and hard to read for low-vision users | Light, cool background with dark blue ink and high contrast |
| Monospace font for the letter and scores | Also the usual detector look | Letters use the display face. Scores use body-face tabular numerals. |

## 3. Design tokens

### Colour

| Name | Hex | Role | Contrast note |
|------|-----|------|---------------|
| Fog | `#EDF0F5` | Page background | |
| Paper | `#FFFFFF` | Surfaces (stage panel, cards) | |
| Deep Ink | `#16213E` | Main text and headings | About 14:1 on Fog |
| Dusk | `#5B6478` | Secondary text, helper copy | About 5:1 on Fog |
| Signal Cobalt | `#2F3BFF` | Primary action, focus ring, frame brackets, label tab | About 6.5:1 with white text |
| Match Green | `#0B7A55` | Success states | About 5.3:1 with white text |
| Alert Red | `#B42318` | Errors | About 6.5:1 with white text |

Rules: colour is never the only signal. Errors also use an icon and text. Success also uses text. The box colours drawn on the result image come from YOLOv5's per-class palette and cannot be controlled, so the label text beside the image always states the result.

### CSS variables

```css
:root {
  --fog: #EDF0F5;
  --paper: #FFFFFF;
  --ink: #16213E;
  --dusk: #5B6478;
  --cobalt: #2F3BFF;
  --cobalt-press: #2028CC;
  --green: #0B7A55;
  --red: #B42318;
  --line: #C9D0DE;

  --font-display: "Bricolage Grotesque", "Segoe UI", system-ui, sans-serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;

  --radius-control: 10px;
  --radius-stage: 4px;
  --space-1: 4px;  --space-2: 8px;  --space-3: 16px;
  --space-4: 24px; --space-5: 40px; --space-6: 64px;
}
```

### Typography

| Role | Typeface | Weight | Notes |
|------|----------|--------|-------|
| Headings and the big detected letter | Bricolage Grotesque | 600-700 | Expressive, gives the site personality |
| Body, buttons, labels, numbers | Atkinson Hyperlegible | 400 and 700 | Designed by the Braille Institute for legibility. Distinct letter shapes suit a site about telling similar shapes apart. |

Load both from Google Fonts with `display=swap`, or self-host them. Keep the fallbacks in the variables above.

| Style | Size / line height | Use |
|-------|--------------------|-----|
| Result letter | 96 / 96 px | The detected letter |
| H1 | 44 / 48 px (36 / 40 on mobile) | Page headline |
| H2 | 28 / 34 px | Section headings |
| H3 | 20 / 26 px | Panel headings |
| Body | 17 / 27 px | Paragraphs and controls |
| Small | 14 / 20 px | Helper text |

Line length stays under 70 characters. Use `font-variant-numeric: tabular-nums` for confidence values.

## 4. Layout

Left-aligned, one page with two modes (Upload and Live camera). The stage is the hero. It is what people see first and what they use.

```
Desktop (12 columns, max width 1120 px)

+------------------------------------------------------------------+
| Signal Frame (logo)                          Upload   Live camera|
+------------------------------------------------------------------+
|                                                                  |
|  Show a sign.                    +----------------------------+  |
|  See what it says.               |[ ]                      [ ]|  |
|                                  |      +--B  93%--+          |  |
|  Short sentence about            |      |  (hand)  |  stage   |  |
|  what the tool does.             |      +----------+          |  |
|                                  |[ ]                      [ ]|  |
|  [ Choose image ]                +----------------------------+  |
|  [ Detect signs ]                 Result: B, 93% confident       |
|                                                                  |
+------------------------------------------------------------------+
|  Tips for better results     |  About this tool and its limits   |
+------------------------------------------------------------------+

Mobile (single column): stage first, then result text, then controls, then tips.
```

- The stage is 7 of 12 columns on desktop and full width on mobile, with a 4:3 aspect ratio.
- Controls sit under the headline on desktop and under the stage on mobile, so the thumb reaches them.
- Page padding: 24 px on mobile, 40 px on desktop. Vertical rhythm uses the spacing tokens.

## 5. Components

### Stage (the signature element)
- Paper background, 1 px `--line` border, `--radius-stage`.
- Four corner brackets in Signal Cobalt, 3 px thick, 28 px long, drawn with pseudo-elements.
- Empty state shows the message "Add a photo or start your camera." centred.
- Result label tab: a Signal Cobalt tab with white text (letter and percentage) attached to the top-left corner of the stage, like a detection label.

### Result readout
- Below the stage: the detected letter in the display face at 96 px, and "93% confident" in body text.
- Several detections: list each on its own line, highest confidence first.
- Wrapped in an `aria-live="polite"` region so screen readers announce updates.

### Buttons
- Primary (Detect signs, Start camera): Signal Cobalt background, white text, 10 px radius, 48 px minimum height, bold label. Pressed state uses `--cobalt-press`.
- Secondary (Choose image, Stop camera): Paper background, 2 px Signal Cobalt border, Cobalt text.
- Disabled: 50% opacity with `aria-disabled` and a text reason nearby. Never rely on colour alone.
- Focus: 3 px Signal Cobalt outline with 2 px offset, on every interactive element.

### Mode switch
- Two-option segmented control ("Upload" and "Live camera") implemented as links to `/` and `/live`, with `aria-current="page"` on the active one.

### Notices
- Success, error, and info messages sit under the stage in a bordered box with an icon, a bold first sentence, and one line of help. Error boxes use Alert Red, success uses Match Green.

### Loading
- While waiting, the stage shows "Reading your sign..." and the button is disabled. No spinner without text.

## 6. States and copy

Copy rules: plain verbs, sentence case, active voice. Name things by what the person does. Errors say what happened and what to try next, and do not apologise.

| Moment | Copy |
|--------|------|
| Headline | Show a sign. See what it says. |
| Sub-headline | Upload a photo or use your camera. The tool finds the hand sign and tells you which letter it sees. |
| Upload button | Choose image |
| Detect button | Detect signs |
| Start camera button | Start camera |
| Stop camera button | Stop camera |
| Empty stage | Add a photo or start your camera. |
| Loading | Reading your sign... |
| Result | Letter B. 93% confident. |
| Low confidence note | Not sure. Try better light or move your hand closer. |
| No sign found | No sign found. Hold your hand in the middle of the frame with a plain background. |
| Wrong file type | That file is not an image. Choose a JPG or PNG. |
| File too large | That image is larger than 5 MB. Choose a smaller one. |
| Camera blocked | Camera access is blocked. Allow the camera in your browser settings, then choose Start camera. |
| No camera found | No camera found. Connect one, or use Upload instead. |
| Server error | Detection did not finish. Check your connection and choose Detect signs again. |
| Privacy note | Your image is sent to our server to find the sign. It is used only for this result and is replaced by the next image. |
| Limits note | This is a learning tool. It can miss or mix up signs, and it does not replace a human interpreter. |

The same action keeps the same name everywhere. "Detect signs" is the button, and the result says "Letter B", not "Prediction".

## 7. Motion

- **One moment:** when a result arrives, the four corner brackets close in by 12 px over 220 ms and the label tab fades in. This answers the person's action and shows what changed.
- Live mode updates the readout in place with no animation.
- Hover and press states change colour only.
- With `prefers-reduced-motion: reduce`, skip the bracket movement and show the final state immediately.

## 8. Responsive behaviour

| Width | Behaviour |
|-------|-----------|
| under 576 px | Single column, stage first, buttons full width, H1 at 36 px |
| 576 to 991 px | Single column, stage up to 640 px wide, buttons side by side |
| 992 px and up | Two columns: text and controls on the left, stage on the right |

Touch targets are at least 44 x 44 px. Nothing scrolls sideways at 320 px.

## 9. Accessibility checklist

- [ ] Text contrast at least 4.5:1, and 3:1 for large text and interface borders
- [ ] Every control reachable and usable with the keyboard, in a logical order
- [ ] Visible 3 px focus ring on all interactive elements
- [ ] Results announced through an `aria-live="polite"` region
- [ ] The result `<img>` has an `alt` such as "Your image with the detected sign marked"
- [ ] The video element has a text label, and the camera state is announced ("Camera on", "Camera off")
- [ ] No information conveyed by colour alone
- [ ] `prefers-reduced-motion` respected
- [ ] Page works at 200% zoom and at 320 px width
- [ ] Language set on `<html lang="en">`
- [ ] Lighthouse accessibility score of 95 or higher

## 10. Implementation notes

- Bootstrap 5 provides the grid (`container`, `row`, `col-*`) and spacing utilities only. Do not use `btn-primary` or Bootstrap colours. Style buttons with the tokens above.
- Put tokens at the top of `static/css/style.css`. Components use tokens, never raw values.
- Keep selectors flat (one class per component, such as `.stage`, `.stage__tab`, `.readout`) so specificity does not fight Bootstrap.
- The hidden capture `<canvas>` in live mode has `hidden` set and is never shown.
