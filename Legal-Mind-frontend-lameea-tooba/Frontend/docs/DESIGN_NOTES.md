# LegalMind UI/UX Design Notes

This document describes the design system, layout paradigms, and colors implemented in the LegalMind user interface. It serves as a guide for developer reference and design system consistency.

---

## 1. Color Palette & Hex Tokens

The interface color theme is designed to evoke trust, security, and professionalism. It maps directly to CSS custom properties defined in `src/index.css` under the `:root` pseudo-class.

### Core Brand Colors

| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| **Beige Sand** | `#E1DBC9` | Accent highlighting, borders, and sidebar highlights |
| **Beige Sand Light** | `#F5F3ED` | Alternating grid backgrounds and cards |
| **Beige Sand Dark** | `#C2B79E` | Darker sand borders and inactive tab states |
| **Slate Blue-Grey** | `#6B7B84` | Neutral text details, icons, and inactive form labels |
| **Earth Brown** | `#4E342E` | Serif typography headers, primary CTA buttons |
| **Earth Brown Hover** | `#3E2723` | Active button focus and cursor hover states |
| **Dark Pine** | `#2D4530` | Active status badges, AI event labels, and secondary buttons |
| **Dark Pine Hover** | `#203122` | Hover focus for green status badges and buttons |

### Neutral Base Colors

| Token Name | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| **Charcoal Grey** | `#3C3C3C` | Body paragraph text and input values |
| **Charcoal Grey Light** | `#5F5F5F` | Secondary body text and labels |
| **Off-White** | `#FAF9F5` | Main panel backgrounds and chat windows |
| **White** | `#FFFFFF` | Core card, modal, and input bar backgrounds |
| **Border** | `#DDD9CD` | Grid dividers, input outlines, and modal borders |

### Dark Mode Semantic Mapping

In `src/index.css`, a local storage-backed dark-theme override (`body.dark-mode`) shifts the color values to a warm night-mode variant:
* **Backgrounds (`--color-off-white` / `--color-white`)**: Shift to `#1C1917` (deep stone/charcoal) and `#272320` (sleek dark warm brown).
* **Text (`--color-charcoal-grey` / `--color-charcoal-grey-light`)**: Shift to `#EBE8E4` (crisp soft white) and `#B0A8A0` (muted warm grey).
* **Borders (`--color-border`)**: Shifts to `#3E3630` (warm dark border) for high visibility without blinding glare.
* **Glow/Shadows**: Shifts from soft brown shadows to deep dark-charcoal ambient glows.

---

## 2. Layout & Responsive Structure (Mobile-First)

The app shell is structured to adapt dynamically across mobile, tablet, and desktop views.

### Mobile Presentation (Width <= 768px)
* **Header**: Displays a simplified `.mobile-header` centering the logo. The desktop header (`.app-header`) is completely hidden.
* **Sidebar**: The left-hand sidebar (`.app-sidebar`) is hidden. A compact active-case dropdown switcher is rendered contextually inside the chat pane header.
* **Navigation**: A persistent bottom bar (`.mobile-nav`) renders at the bottom of the screen with standard touch targets (48x48px min size) to switch between:
  1. *AI Consultation* (Chat)
  2. *Lawyer Finder* (Directory)
  3. *Guidelines* (Info)
  4. *Profile* (User)
* **Background Elements**: Highly detailed background illustrations and watermarks are stripped out to optimize readability and reduce processing load on mobile devices.

### Desktop Presentation (Width > 768px)
* **Header**: Shows `.app-header` displaying the full navigation links on the right-hand side.
* **Dual-Pane View**: Employs a left sidebar (`.app-sidebar`) that can be collapsed into a badge-only icon state. The sidebar exposes real-time Case summaries with expandable AI event lists.
* **Main Pane**: Flexible content grid stretching to fit widescreen layouts.

---

## 3. Loading (Skeletons) & Empty States

Skeletons and empty states are structured using modular CSS classes to ensure zero layout shift.

### Skeleton States
* Pulsing animations are powered by CSS `@keyframes skeletonPulse` (light mode) and `@keyframes skeletonPulseDark` (dark mode) affecting opacity.
* All elements (`.skeleton-text`, `.skeleton-circle`, `.skeleton-card`, `.skeleton-button`) maintain exact dimensions of the elements they replace, preventing layout instability once data loads.
* The state is wired via `isLoading` inside components, allowing engineers to wire real API calls directly into the components by overriding this boolean.

### Empty States
* Handled via the `.empty-state-container` class, exposing a serif title, descriptive illustration, and a primary CTA (such as "Start New Consultation" or "Create Your First Case") to guide the user back into active flows.
