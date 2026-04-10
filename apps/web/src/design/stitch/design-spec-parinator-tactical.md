# Parinator Tactical (Stitch asset `assets/2de2ef295f68441ca7f4a26ede546ec2`)

Imported from Google Stitch project **Parinator** (`14452944700689366656`).

# Midnight Matrix: Design System

## 1. Overview & Creative North Star
**Creative North Star: The Command Tactical Interface**

Midnight Matrix is a high-performance design system engineered for high-density data environments. It moves away from the "friendly consumer app" aesthetic toward a "Command & Control" ethos. The system rejects the generic whitespace of modern SaaS in favor of technical density, intentional asymmetry, and a brutalist, zero-radius geometric language. It feels less like a website and more like a tactical HUD for professionals who value precision over softness.

## 2. Colors
The palette is rooted in deep obsidian tones (`#0e0e0e`) and technical greys, punctuated by high-visibility functional signals.

- **Primary Role:** A muted, technical steel blue (`#bbc8d0`) used for primary structural text and active states.
- **Secondary Role:** A high-contrast neon green (`#13ea79`) reserved for "Success," "Live," and "Active" indicators.
- **Surface Hierarchy:**
    - **Base:** `#0e0e0e` (Deepest)
    - **Containers:** Incremental steps through `#131313` and `#191a1a` provide depth without shadows.
- **The "No-Line" Rule:** Visual separation is achieved through background color shifts. Borders, when used, are strictly 1px and leverage `outline-variant` (`#484848`) at low opacity or are omitted entirely in favor of container nesting.
- **Signature Textures:** Use `rgba(0, 0, 0, 0.3)` for input backgrounds to create an "inset" technical feel.

## 3. Typography
The system utilizes a dual-font strategy to balance technical utility with extreme legibility.

- **Display & Headline (Space Grotesk):** A geometric sans-serif with a technical edge. Used for 4xl (2.25rem) page titles and 1.125rem - 1.5rem component headers. It should always be high-weight (Bold/Black) and often Uppercase.
- **Body & Labels (Inter):** The workhorse font for high-density data.
- **The Scale:**
    - **4xl (2.25rem):** Page headers, tracking-tighter.
    - **Base (0.875rem):** Standard body copy.
    - **Micro (10px / 9px):** Used for "Metadata Labels" and "Overlines." These must be Uppercase with wide tracking (0.1em - 0.2em) to ensure professional legibility.

## 4. Elevation & Depth
In Midnight Matrix, depth is not simulated with light; it is defined by "Material Stacking."

- **The Layering Principle:** Higher-priority information sits on lighter backgrounds (e.g., `surface-container-highest` at `#252626`).
- **Shadows:** We use the `shadow-2xl` profile only for floating overlays (like the Legend popup), ensuring the main interface feels grounded and integrated.
- **Glassmorphism:** Use subtle `backdrop-blur` and semi-transparent backgrounds for floating headers to maintain a sense of context behind the UI.
- **The "Ghost Border":** 1px solid borders using `#252626` are used to define the grid, creating a technical "blueprint" look.

## 5. Components
- **Buttons:** Sharp 0px corners. Primary buttons are solid blocks of color with high-contrast centered text. Secondary buttons use a transparent background with a 1px border.
- **The Matrix (Data Grid):** Cells are fixed-dimension (90px height) and use color-blocking to communicate status (e.g., green for domination, red for loss).
- **Split-Cells:** For complex data points, use diagonal CSS clip-paths to show two values in one cell—a signature of this system's high-density approach.
- **Inputs:** Darkened `rgba` backgrounds with a neon secondary border on focus.
- **Chips/Status:** Small, high-contrast pills with 9999px radius (the only exception to the 0px rule) for "Live" indicators.

## 6. Do's and Don'ts
- **DO:** Use all-caps for metadata and labels to reinforce the tactical feel.
- **DO:** Use intentional asymmetry in sidebar layouts to break the grid.
- **DON'T:** Use rounded corners on any primary structural elements (Cards, Buttons, Headers).
- **DON'T:** Use gradients for depth; use solid tonal shifts between surface-containers.
- **DO:** Prioritize information density over whitespace. If a screen feels "empty," increase the scale of secondary data points or add technical metadata.
