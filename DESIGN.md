---
version: "alpha"
name: "Global System Dashboard"
description: "Global System Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "#0F172A"
  secondary: "#3B82F6"
  tertiary: "#020617"
  neutral: "#FFFFFF"
  background: "#FFFFFF"
  surface: "#0F172A"
  text-primary: "#64748B"
  text-secondary: "#FFFFFF"
  border: "#FFFFFF"
  accent: "#0F172A"
typography:
  display-lg:
    fontFamily: "System Font"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: "48px"
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "System Font"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0.025em"
  label-md:
    fontFamily: "System Font"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  full: "9999px"
spacing:
  base: "4px"
  sm: "1px"
  md: "2px"
  lg: "4px"
  xl: "6px"
  gap: "1px"
  card-padding: "9px"
  section-padding: "40px"
components:
  button-primary:
    backgroundColor: "{colors.neutral}"
    textColor: "#050B14"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "10px"
  button-secondary:
    textColor: "{colors.neutral}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "10px"
  card:
    rounded: "16px"
    padding: "20px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Full Bleed
  - Framing: Glassy
  - Grid: Strong

## Colors

The color system uses dark mode with #0F172A as the main accent and #FFFFFF as the neutral foundation.

- **Primary (#0F172A):** Main accent and emphasis color.
- **Secondary (#3B82F6):** Supporting accent for secondary emphasis.
- **Tertiary (#020617):** Reserved accent for supporting contrast moments.
- **Neutral (#FFFFFF):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFFFFF; Surface: #0F172A; Text Primary: #64748B; Text Secondary: #FFFFFF; Border: #FFFFFF; Accent: #0F172A

- **Gradients:** bg-gradient-to-b from-transparent to-transparent via-blue-400/20, bg-gradient-to-br from-white/20 to-transparent via-white/[0.02], bg-gradient-to-br from-[#121E31] to-[#0A111F], bg-gradient-to-b from-transparent to-transparent via-white/10

## Typography

Typography relies on System Font across display, body, and utility text.

- **Display (`display-lg`):** System Font, 48px, weight 600, line-height 48px, letter-spacing -0.025em.
- **Body (`body-md`):** System Font, 12px, weight 400, line-height 16px, letter-spacing 0.025em.
- **Labels (`label-md`):** System Font, 14px, weight 500, line-height 20px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, full bleed structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / full bleed composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Full Bleed
- **Base unit:** 4px
- **Scale:** 1px, 2px, 4px, 6px, 8px, 10px, 12px, 16px
- **Section padding:** 40px, 72px
- **Card padding:** 9px, 12px, 20px, 40px
- **Gaps:** 1px, 4px, 8px, 16px

## Elevation & Depth

Depth is communicated through glass, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as glass first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Glass
- **Borders:** 1px #FFFFFF; 1px #3B82F6
- **Shadows:** rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(59, 130, 246, 0.8) 0px 0px 8px 0px; rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.25) 0px 25px 50px -12px
- **Blur:** 12px, 40px, 4px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 20px padding and a 16px radius. Drive the shell with linear-gradient(to right bottom, rgb(18, 30, 49), rgb(10, 17, 31)) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 1px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 1px, 12px, 16px, 39px, 40px, 9999px
- **Icon treatment:** Linear
- **Icon sets:** Solar

## Components

Anchor interactions to the detected button styles. Reuse the existing card surface recipe for content blocks.

### Buttons
- **Primary:** background #FFFFFF, text #050B14, radius 9999px, padding 10px, border 0px solid rgb(229, 231, 235).
- **Secondary:** text #FFFFFF, radius 9999px, padding 10px, border 1px solid rgba(255, 255, 255, 0.1).

### Cards and Surfaces
- **Card surface:** border 1px solid rgba(255, 255, 255, 0.2), radius 16px, padding 20px, shadow rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.6) 0px 20px 30px 0px.

### Iconography
- **Treatment:** Linear.
- **Sets:** Solar.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Glass surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 1px, 12px, 16px, 39px, 40px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 1000ms. Easing favors ease and 0. Hover behavior focuses on text and color changes.

**Motion Level:** moderate

**Durations:** 150ms, 1000ms, 2000ms

**Easings:** ease, 0, 1), 0.2, cubic-bezier(0.4, cubic-bezier(0

**Hover Patterns:** text, color, stroke

## WebGL

Reconstruct the graphics as a full-bleed background field using webgl, custom shaders. The effect should read as technical, meditative, and atmospheric: dot-matrix particle field with black and sparse spacing. Build it from dot particles + soft depth fade so the effect reads clearly. Animate it as slow breathing pulse. Interaction can react to the pointer, but only as a subtle drift. Preserve dom fallback.

**Id:** webgl

**Label:** WebGL

**Stack:** WebGL

**Insights:**
  - **Scene:**
    - **Value:** Full-bleed background field
  - **Effect:**
    - **Value:** Dot-matrix particle field
  - **Primitives:**
    - **Value:** Dot particles + soft depth fade
  - **Motion:**
    - **Value:** Slow breathing pulse
  - **Interaction:**
    - **Value:** Pointer-reactive drift
  - **Render:**
    - **Value:** WebGL, custom shaders

**Techniques:** Dot matrix, Breathing pulse, Pointer parallax, Shader gradients, Noise fields

**Code Evidence:**
  - **HTML reference:**
    - **Language:** html
    - **Snippet:**
      ```html
      <!-- WebGL Mesh Gradient Background -->
      <canvas id="mesh-canvas" class="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-80"></canvas>

      <!-- Planetary/Infrastructural Grid Overlay -->
      ```
