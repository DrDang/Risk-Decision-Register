# Design System Specification: The Governed Surface

## 1. Overview & Creative North Star: "The Architectural Anchor"
This design system is built to transform the often-cluttered landscape of governance and risk management into a space of absolute clarity and high-trust authority. Our Creative North Star is **The Architectural Anchor**. 

Unlike standard "SaaS-blue" dashboards, this system rejects the "boxed-in" feeling of traditional software. We break the template by using **Tonal Layering** and **Intentional Asymmetry**. We treat the interface as an editorial layout—where data isn't just displayed, it is curated. By utilizing sophisticated depth and a rigorous typographic scale, we move away from "utility" and toward a "professional sanctuary."

---

## 2. Colors: Tonal Depth over Borders
The palette is rooted in deep navies (`#4F5E7E`) and slates (`#526074`), designed to evoke the stability of a physical institution.

### The "No-Line" Rule
**Lines are a sign of structural weakness.** In this system, 1px solid borders for sectioning are prohibited. Boundaries must be defined solely through background color shifts.
*   **Action:** Place a `surface-container-low` section against a `surface` background to define a sidebar or header. Use `surface-container-highest` only for the most critical interactive focal points.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following tiers to create "nested" depth:
*   **Base Layer:** `surface` (#F7F9FB) – The canvas.
*   **Secondary Layer:** `surface-container-low` (#F0F4F7) – Large structural areas (e.g., Side Navigation).
*   **Content Layer:** `surface-container` (#E8EFF3) – Main workspace background.
*   **Interactive Layer:** `surface-container-highest` (#D9E4EA) – Floating panels or active states.

### The "Glass & Gradient" Rule
To elevate the experience, use **Glassmorphism** for floating elements (like dropdowns or hovering detail panels). Apply `surface_container_lowest` at 80% opacity with a `24px` backdrop blur. 
*   **Signature Texture:** For primary CTAs, use a subtle linear gradient from `primary` (#4F5E7E) to `primary_dim` (#435272) at a 135-degree angle. This adds "soul" and weight to the action.

---

## 3. Typography: The Editorial Voice
We utilize a dual-font strategy to balance character with data-density.

*   **Display & Headlines (Manrope):** This is our "Editorial" voice. The geometric nature of Manrope provides an authoritative, modern feel.
    *   *Usage:* Use `display-md` for high-level risk scores and `headline-sm` for section headers.
*   **Body & UI (Inter):** This is our "Functional" voice. Inter is chosen for its exceptional legibility at small sizes in dense data tables.
    *   *Usage:* `body-md` for table content; `label-sm` for metadata.

**Hierarchy Tip:** Always pair a bold `title-sm` (Inter) with a `label-md` (Inter, 50% opacity) for "Label/Value" pairs to ensure the eye hits the data first, not the description.

---

## 4. Elevation & Depth: Tonal Layering
We avoid "drop shadows" that look like 2010-era software. We use light to imply importance.

*   **The Layering Principle:** Instead of a shadow, place a `surface-container-lowest` (#FFFFFF) card on top of a `surface-container-low` (#F0F4F7) background. The contrast creates a natural "lift."
*   **Ambient Shadows:** For floating modals, use an extra-diffused shadow: `box-shadow: 0 12px 40px rgba(42, 52, 57, 0.08);`. The shadow color is derived from `on_surface`, making it feel like a natural occlusion of light rather than a gray smudge.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border (e.g., in high-contrast modes), use a **Ghost Border**: `outline_variant` at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Refined Utility

### Data Tables (The Core Component)
*   **Structure:** Forbid divider lines. Use `16px` of vertical padding and alternating row tints using `surface-container-low` for every second row to guide the eye.
*   **Typography:** All numerical data must be monospaced or use tabular num features to ensure columns align perfectly.

### Buttons & Chips
*   **Primary Button:** Uses the signature gradient with `0.375rem` (md) roundedness.
*   **Risk Chips:** Use semantic containers with `on_container` text.
    *   *Critical Risk:* `error_container` (#FE8983) background with `on_error_container` (#752121) text.
*   **Ghost Chips:** For low-priority metadata, use `surface-variant` with `on_surface_variant` text.

### Form Layouts
*   **Input Fields:** Use `surface-container-lowest` as the fill. Instead of a thick border, use a `2px` bottom-bar of `primary_fixed` that glows slightly when focused.
*   **Checkboxes/Radios:** Use `primary` for the checked state. Unchecked states should use a "Ghost Border" (`outline_variant` at 20%) to keep the UI "calm."

### Status Badges (Governance Context)
*   Create a "Confidence Meter" component: A thin, horizontal bar using `surface-variant` as the track and the semantic risk colors (Green to Dark Red) as the progress fill.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `9999px` (full) roundedness for status badges to make them feel like "pills" distinct from the `0.375rem` (md) squareness of the layout.
*   **Do** use `title-lg` for page titles with a generous `48px` bottom margin to allow the layout to breathe.
*   **Do** use Tonal Transitions (background color shifts) to separate "Navigation," "Header," and "Content."

### Don’t
*   **Don’t** use a black shadow. It kills the "Deep Navy" sophistication of the palette.
*   **Don’t** use 1px dividers between table rows; let the white space and subtle row-tinting handle the separation.
*   **Don’t** use "Inter" for large headlines. It lacks the architectural weight required for a high-end governance tool; use "Manrope" instead.
*   **Don’t** crowd the edges. Use a minimum of `32px` padding on all main container edges.