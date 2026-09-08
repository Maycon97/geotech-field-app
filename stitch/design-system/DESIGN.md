---
name: Antigravity Geotechnical Precision
colors:
  surface: '#0a1228'
  surface-dim: '#0a1228'
  surface-bright: '#313850'
  surface-container-lowest: '#050d23'
  surface-container-low: '#131b31'
  surface-container: '#171f35'
  surface-container-high: '#222940'
  surface-container-highest: '#2c344c'
  on-surface: '#dbe1ff'
  on-surface-variant: '#bec8d2'
  inverse-surface: '#dbe1ff'
  inverse-on-surface: '#283047'
  outline: '#88929b'
  outline-variant: '#3e4850'
  surface-tint: '#89ceff'
  primary: '#89ceff'
  on-primary: '#00344d'
  primary-container: '#0ea5e9'
  on-primary-container: '#003751'
  inverse-primary: '#006591'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#d88a00'
  on-tertiary-container: '#4a2c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0a1228'
  on-background: '#dbe1ff'
  surface-variant: '#2c344c'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  title-sm:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  data-metric:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  code-telemetry:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  gutter: 1rem
  sidebar-width: 260px
---

## Brand & Style
This design system is tailored for critical infrastructure engineering, deep telemetry monitoring, and geotechnical instrumentation management. It balances industrial rigor with an ultra-modern aesthetic. The primary audience encompasses geotechnical field inspectors, instrumentation specialists, dam safety managers, and executive technical committees. 

The emotional tone evokes mission-critical dependability, precision engineering, calm focus during operational anomalies, and effortless clarity under high data densities. 

The visual style blends **Technical Minimalism** with **Controlled Glassmorphism**. Dark slate and deep-navy canvas layers isolate information into legible compartments, while fine translucent panels, delicate inner glows, and micro-bordered card containers direct immediate attention to telemetry anomalies, TARP triggers, and sensor health states without sensory fatigue.

## Colors
The palette is engineered around dark slate-navy depths and vibrant, high-luminance diagnostic indicators.

- **Primary Core (`#0ea5e9` / `#38bdf8`)**: Represents dynamic instrumentation and active data streams. Used for key call-to-actions, active telemetry nodes, selected states, and real-time syncing indicators.
- **Normal / Health Status (`#10b981`)**: Designates stable piezometric pressures, verified water levels, synced local queues, and compliant structural health.
- **TARP Level 1 / Warning (`#f59e0b`)**: Highlights non-critical threshold deviations, pending offline reviews, and cautionary telemetry delta shifts.
- **TARP Level 2 & 3 / Critical Alert (`#ef4444`)**: Dictates critical safety breaches, pore-pressure trigger limits, or offline hardware faults requiring immediate dispatch.
- **Neutral Foundation (`#0b1329`, `#101c38`, `#18264e`)**:
  - `Surface 0 (#0b1329)`: Deep void backdrop minimizing optical strain.
  - `Surface 1 (#101c38)`: Primary module containers and persistent side rails.
  - `Surface 2 (#18264e)`: Elevated diagnostic cards, dropdown surfaces, and modal sheets.
  - `Surface Glass`: `rgba(16, 28, 56, 0.75)` with subtle backdrop blur (`12px`) and an interior top-border highlight (`rgba(56, 189, 248, 0.15)`).
- **Text & Contrast**: High-contrast ice white (`#f8fafc`) for structural headlines, muted slate (`#94a3b8`) for secondary metrics and labels, and dim slate (`#64748b`) for technical metadata.

## Typography
The typographic hierarchy blends the geometry of **Outfit** for headlines and high-level structural labels with the legibility of **Inter** for data tables and running operational copy. Technical hardware tags, instrument IDs (e.g., `PZ-04A`, `INA-12`), coordinates, and numerical telemetry values leverage **JetBrains Mono** to guarantee alignment across tabular displays.

All metric displays (KPI numbers) prioritize instant scan-ability, utilizing negative letter spacing to lock values firmly within their context cards.

## Layout & Spacing
The layout uses an adaptive dashboard grid rooted in an 8px architectural unit (base modular unit: `0.5rem` / `8px`).

- **Application Shell**: Collapsible fixed-width primary navigation rail (260px) along the left flank, anchoring field operator identity, real-time connectivity status (Online/Offline cache), and module routing.
- **Top Utility Deck**: Fixed height (64px) horizontal ribbon for environment context, TARP status roll-ups, global sync action triggers, and active geotechnical asset scope selectors.
- **Primary Viewport (Content Grid)**: A 12-column responsive layout utilizing a 16px (`1rem`) gutter. Cards span 3 columns for micro-telemetry cards, 6 columns for bivariate chart displays, and 12 columns for critical spatial maps or tabular instrument logs.
- **Density Adaptation**: Spacing compacts to a 4px rhythm on dense tabular data views to maximize visible information per screen, while overview dashboard cards utilize 24px (`space-lg`) internal padding for optimal breathing room.

## Elevation & Depth
Elevation in this system eschews muddy drop shadows in favor of **Layered Translucency with Edge Luminance**:

- **Ground Level (Base Canvas)**: Solid `#0b1329` with an ultra-subtle directional gradient to `#080d1c`.
- **Card Surface Level**: Semi-translucent `#101c38` with 80% opacity, backdropped by a `16px` blur filter. Outlines feature a 1px border colored with `rgba(255, 255, 255, 0.08)`.
- **Elevated Interactive/Highlight Level**: Border shifts to `rgba(14, 165, 233, 0.35)` with an ambient cyan glow (`0 0 20px -4px rgba(14, 165, 233, 0.15)`).
- **Overlays and Modals**: Elevated `#18264e` solid surface framed with `box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(56, 189, 248, 0.2)`.

## Shapes
A clean, precise visual discipline governs all interfaces. Corners utilize a restrained radius (`0.375rem` to `0.5rem`) to ensure technical rigor and structural density without sharp industrial harshness. 

Status pills and badge indicators use fully rounded caps (`pill-shaped`), contrasting against rectangular telemetry cards and structured grid containers.

## Components

### Buttons
- **Primary Action**: Gradient fill from `#0ea5e9` to `#0284c7`, subtle 1px top border `rgba(255, 255, 255, 0.25)`, crisp ice-white typography, hover state activates a subtle outer cyan aura.
- **Secondary Action**: Translucent dark fill (`rgba(24, 38, 78, 0.6)`), 1px border in `rgba(56, 189, 248, 0.3)`, text in `#38bdf8`.
- **Destructive/TARP 3 Action**: Surface tint `#ef4444` with high-contrast white text, used strictly for triggering emergency protocols or marking critical dam integrity alerts.

### Telemetry & Instrument Cards
- Feature a 1px top highlight gradient that mimics ambient light reflection.
- Upper right holds the instrument type badge (e.g., `INA`, `PZ`, `MED`) rendered in mono typography.
- Metric display pairs the primary value with dynamic variance indicators (e.g., `+0.04 m`, `↓ 12 kPa`) using green/amber/coral status tags.

### Status Chips & TARP Indicators
- Compact, pill-shaped tags with a micro status beacon (a 6px glowing dot with an optional CSS pulse animation for TARP Level 2/3).
- Low-saturation background (`rgba(16, 185, 129, 0.12)`) paired with high-saturation text (`#10b981`) ensures WCAG AAA contrast against dark slate surfaces.

### Tables & Data Grids
- Alternating subtle row fills (`transparent` vs `rgba(255, 255, 255, 0.02)`).
- Sticky headers with `rgba(16, 28, 56, 0.95)` blur overlay.
- All numerical values right-aligned using tabular mono figures.

### Form Inputs & Checklists
- Slate-bordered inset fields (`#101c38`) with crisp focus borders in `#0ea5e9`.
- Field checklist toggles are built with generous touch targets (min 48px height) for tablet and ruggedized mobile field usability.