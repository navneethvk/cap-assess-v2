## Healthcare PWA UI Brief — Pastel Design with Vintage Handheld Vibe

### 1. Design Principles

- **Calm & Clinical**: Pastels, whitespace, legibility. No harsh colors.
- **Gentle Nostalgia**: Rounded corners, shadows, pixel-style icons, lo-fi animations.
- **Accessibility**: WCAG 2.2 AA minimum. Every state has sufficient contrast.
- **Mobile-First, Responsive**: Works from 320px upwards. Degrades gracefully.
- **Healthcare-Ready**: Predictable interactions. Green = healthy, Peach = caution, Rose = error.

---

### 2. Design Tokens (single source of truth)

#### Primary Pastels

```
--color-primary: #E8E3F5;
--color-success: #C7E9D7;
--color-info: #D6E5F0;
--color-warning: #FFE5CC;
```

#### Neutrals

```
--color-bg-primary: #FAFBFC;
--color-bg-secondary: #F3F4F6;
--color-text-body: #64748B;
--color-text-heading: #1E293B;
```

#### Accents

```
--color-error: #F5D5DC;
--color-active: #B5F4E0;
--color-highlight: #FFF4D6;
```

#### Shadows, Borders, Spacing

```
--shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
--border-soft: 1px solid #E2E8F0;
--spacing-unit: 8px;
--radius-default: 12px;
--radius-pill: 24px;
```

#### Motion

```
--duration: 200ms;
--easing: cubic-bezier standard ease-in-out;
```

---

### 3. Color Usage & Contrast

- Text: Charcoal (headings), Slate (body). No black.
- States: Use pastel background with darker text.
- Backgrounds: Cloud white with Soft Gray for sections.
- Ensure contrast always hits WCAG AA.

---

### 4. Typography

- Headline: semibold, charcoal.
- Body: base size, slate.
- Captions: small text, slate @ 70% opacity.
- Max line length: 70 chars.
- Truncation: 1-line titles, 2–3-line descriptions.

---

### 5. Iconography

- Style: Outline, even stroke, no realism.
- Retro cue: pixel-style geometry, slight square corners.

---

### 6. Layout, Grid, Breakpoints

- Mobile-first: 320px and up.
- Padding: 16px mobile, 24px tablet+.
- Max-width for content on desktop.
- Cards: 2-column (tablet), 3-column (desktop).

---

### 7. Elevation & Surface

- Cards: white, soft border, subtle shadow.
- Pressed: micro-scale (≤3%), reduced shadow.
- LCD mimic: soft inner shadow + top light border.

---

### 8. Motion

- Transitions: 200ms.
- Page: slide-in/fade-in.
- Loading: skeleton shimmer.
- Live data: gentle pulse.

---

### 9. Navigation

- Bottom nav (≤5 items), always labeled.
- Top app bar: title, actions.
- Tablet+: optional side rail.
- Back: return to prior context only.

---

### 10. Components

#### Buttons

- Primary: lavender gradient fill, charcoal text.
- Secondary: border only.
- Tertiary: text-only.
- Destructive: Rose, charcoal text.
- States: Focus ring, press scale, disabled = opacity.

#### Inputs

- White bg, soft border, lavender ring on focus.
- Error = rose, Helper text = slate.

#### Selection Controls

- Checkbox: square box.
- Radio: circular.
- Switch: pill track, beveled thumb.

#### Lists, Cards

- Rows ≥56px. Icons optional.
- Cards: optional headers, actions, soft styling.

#### Modals, Toasts

- Center or bottom sheet.
- Slide or scale+fade.
- Toasts: top slide, auto-dismiss ≤4s.

#### Progress

- Rings for goals. Bars with rounded ends.

#### Empty States

- Pastel outline illustration, 1 action.

---

### 11. Healthcare Patterns

- Group vitals in cards.
- Icons + labels, not color only.
- Semantic color use: Green (OK), Peach (warn), Rose (error).

---

### 12. Accessibility

- Focus visible. Keyboard tabbing logical.
- Hit areas ≥44px.
- Motion sensitivity mode.
- aria-labels for icons.

---

### 13. PWA Requirements

- Theme color: Lavender.
- iOS status bar default.
- Offline shell + skeletons.
- Install prompt after success, not on load.

---

### 14. Responsiveness

- Bottom tabs on phones.
- Side rail on larger.
- Typography scales fluidly.
- Safe area paddings respected.

---

### 15. Retro Mode (Opt-in Skin)

- Plastic grain overlay.
- LCD panel hint: soft inner shadow.
- Thicker borders on buttons.
- Slow-pulse dot for tracking.

---

### 16. Content & Microcopy

- Tone: Calm, precise.
- Errors: Explain + recovery.
- No medical advice.

---

### 17. Security & Privacy

- No sensitive logs.
- Mask fields by default.
- Session timeouts for secure actions.

---

### 18. Performance Budget

- LCP < 2.5s.
- INP < 200ms.
- Lazy load non-critical.

---

### 19. Internationalization

- Variable label length.
- Localize time/number.
- RTL-ready icons and nav.

---

### 20. QA Checklist

- Tokens only.
- 8px spacing grid.
- Accessible contrast, hit areas.
- Hover/focus/press/disabled states.
- Motion <300ms.
- Empty/loading/error states covered.
- Navigation correct.
- Responsive from 320px up.
- Semantic colors respected.
- Performance budgets met.

---

### 21. Delivery Notes for Claude CLI

- Tokens centralized.
- Themes: pastel base + "Handheld" skin toggle.
- Build primitives → compose screens.
- Snapshot all states.
- No library lock-in.

---

### 22. Final Non-Negotiables

- No tokens = doesn’t ship.
- No focus = doesn’t ship.
- Hit area <44px = doesn’t ship.
- Color-only states = doesn’t ship.
- Fail perf budget = doesn’t ship.

---

### 23. Material 3 Expressive Alignment

- Add: expressive typography, state layers, elevation tint.
- Map tokens to roles via definitive table.
- Retro surfaces: grain overlay, LCD cards.
- Typography: use M3 scale names.
- Motion: container transform, fade-through.
- Navigation: pill indicator, adaptive nav.
- Buttons: Filled/Tonal/Outlined/Text.
- Inputs: Filled or Outlined with helper.
- Density: 48×48 goal.

---

### Summary

Build a pastel-first, highly accessible healthcare PWA with a tasteful retro polish. Ship fast, readable, usable UI. The retro vibe should add comfort—not complexity. Follow tokens and semantic rules strictly. Never sacrifice usability, performance, or clarity for visual flair.

