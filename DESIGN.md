---
name: TUMAR Guardian
colors:
  surface: '#0e141b'
  surface-dim: '#0e141b'
  surface-bright: '#343a42'
  surface-container-lowest: '#090f16'
  surface-container-low: '#161c23'
  surface-container: '#1a2027'
  surface-container-high: '#252a32'
  surface-container-highest: '#2f353d'
  on-surface: '#dde3ed'
  on-surface-variant: '#d1c5b4'
  inverse-surface: '#dde3ed'
  inverse-on-surface: '#2b3139'
  outline: '#9a8f80'
  outline-variant: '#4e4639'
  surface-tint: '#e9c176'
  primary: '#e9c176'
  on-primary: '#412d00'
  primary-container: '#c5a059'
  on-primary-container: '#4e3700'
  inverse-primary: '#775a19'
  secondary: '#bcc7dc'
  on-secondary: '#263141'
  secondary-container: '#3c4759'
  on-secondary-container: '#aab6ca'
  tertiary: '#ffb3ae'
  on-tertiary: '#68000b'
  tertiary-container: '#ff7f78'
  on-tertiary-container: '#7a0a13'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea5'
  primary-fixed-dim: '#e9c176'
  on-primary-fixed: '#261900'
  on-primary-fixed-variant: '#5d4201'
  secondary-fixed: '#d8e3f9'
  secondary-fixed-dim: '#bcc7dc'
  on-secondary-fixed: '#111c2c'
  on-secondary-fixed-variant: '#3c4759'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#8b191d'
  background: '#0e141b'
  on-background: '#dde3ed'
  surface-variant: '#2f353d'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system translates the quiet dignity, physical craftsmanship, and protective assurance of a wearable smart safety pendant into a digital companion. It serves two interconnected cohorts: loved ones receiving emergency SOS signals, and older adults or vulnerable wearers checking device health and connectivity.

The personality rejects the loud, clinical, alarmist visual language typical of telecare devices. Instead, it embodies:
- **Calm Authority**: In high-stress emergency states, panic is reduced through stable, deeply grounded slate foundations and precise hierarchy.
- **Jewelry-Grade Tactility**: Echoing the physical pendant's brushed steel, deep navy leather inlay, and warm gold framing.
- **Uncompromised Inclusivity**: Legibility, high contrast, and large touch zones designed explicitly for aging eyes and trembling hands, without looking remedial or infantilizing.

The aesthetic blends **Dark Minimalist Refinement** with **Subtle Tactile Skeuomorphism**—surfaces are multi-tiered midnight slate, accents carry a muted metallic warmth, and interactive elements possess physical weight and unmistakable feedback states.

## Colors

The palette directly derives from the physical pendant in the reference visual: midnight navy leather, titanium casing, and fine gold bezel work.

### Palette Roles & Accessibility Rules

- **Base Canvas (`#0B1118`)**: Deep obsidian-navy serving as the ambient foundation. Reduces ocular strain and enhances perceived battery efficiency on OLED devices.
- **Card / Surface Container (`#101924`)**: Elevated surface tier for functional grouping, cards, and navigation trays.
- **Interactive Container (`#1B2636`)**: Secondary slate used for passive buttons, segment controls, borders, and input strokes.
- **Primary Accent (`#C5A059`)**: Antique brushed gold. Reserved for critical interactive signifiers, status confirmation, battery health, and primary action affordances.
- **Primary Ivory Text (`#F4EFE6`)**: Warm milk-white text providing an ultra-high 14.5:1 contrast ratio against the obsidian background, avoiding the harsh glare of pure `#FFFFFF`.
- **Muted Slate Text (`#9AA6B8`)**: Secondary typography, metadata, and timestamps; complies with WCAG AA (minimum 4.8:1 against container tier).
- **Emergency SOS Signal (`#D9534F`)**: Saturated crimson-coral. Dedicated strictly to active panic/SOS triggers, high-priority geo-fence breaches, and device disconnection alerts.

## Typography

The type system addresses two critical criteria: the refined architectural character of luxury hardware, paired with effortless, instantaneous readability for elders under duress.

- **Display & Headlines (`Space Grotesk`)**: Structural, stable, and subtly geometric. Gives numbers, coordinates, names, and titles an engineered, dependable character reminiscent of precision instrumentation.
- **Body & Labels (`Plus Jakarta Sans`)**: Highly legible humanist geometric sans with open counters, distinct aperture shapes, and robust weights. Ensures that addresses, status cards, and battery readouts remain clear at arm's length or in ambient glare.
- **Accessibility Minimums**: Critical body content never drops below 16px. Tertiary captions are capped at a hard floor of 12px with uppercase tracking to retain glyph separation.

## Layout & Spacing

The layout operates on an uncompromising 8-point rhythmic grid, optimized for single-handed mobile responsiveness and thumb-zone safety.

- **Mobile Canvas**: 4-column fluid layout with `1rem` (16px) margins and `0.75rem` (12px) gutters. The bottom 35% of the viewport is designated the primary interactive zone (action cards, SOS dispatch confirmation, contact speed dials).
- **Tablet / Expanded Screen**: 8-column layout with a pinned master-detail split for map telemetry alongside wearers' status feeds. Max content width is restricted to 720px for singular dashboard cards to maintain ergonomic tracking.
- **Touch Target Enforcements**: All tap targets—including auxiliary dismiss controls, chip selectors, and toggle switches—measure a mandatory minimum height of `56px` to ensure effortless targeting for senior citizens.

## Elevation & Depth

Visual hierarchy relies on calibrated surface luminance and razor-thin metallic specular borders rather than deep, fuzzy shadows.

- **Ground Level (Canvas)**: `#0B1118` matte canvas.
- **Tier 1 (Surface Containers & Cards)**: `#101924` accompanied by a precise `1px` inner boundary of `rgba(197, 160, 89, 0.12)` or `rgba(255, 255, 255, 0.05)`.
- **Tier 2 (Floating Action Banners / Emergency Alerts)**: `#162232` elevated with a directional ground shadow: `0px 12px 32px -4px rgba(0, 0, 0, 0.65)`, complemented by a top highlight rim (`rgba(244, 239, 230, 0.08)`).
- **Emergency SOS Depth**: Active alert states leverage an ambient outer glow using the tertiary crimson tone: `0 0 40px rgba(217, 83, 79, 0.35)`.

## Shapes

The geometric silhouette mirrors the organic yet engineered profile of the circular/oval pendant:

- **Standard Surfaces & Cards**: `rounded-lg` (16px / `1rem`), providing a welcoming handheld feel that prevents clinical sharpness while preserving layout discipline.
- **Inner Controls & Action Fields**: `rounded` (8px / `0.5rem`) for form inputs, chips, and sub-elements.
- **Interactive Badges & Pendant Indicators**: Complete pill forms (`rounded-full` / 9999px) for live connection statuses, battery pills, and caller tags, honoring the oval pendant aesthetic.

## Components

### Buttons
- **Primary Action (Acknowledge / Call Services)**: Minimum 56px height. Background `#C5A059`, label in `#0B1118` with `label-lg` semi-bold type. Gentle inset top rim highlight (`rgba(255,255,255,0.2)`).
- **Emergency Trigger / Cancel Bar**: Minimum 64px height. High-contrast `#D9534F` fill, crisp `#F4EFE6` label. Dedicated 3-second long-press tactile animation with radial progress fill.
- **Secondary / Dismiss Action**: Slate surface (`#1B2636`), border `1px solid rgba(197, 160, 89, 0.25)`, ivory text `#F4EFE6`.

### Cards & Telemetry Surfaces
- Structured with `#101924` surface fills.
- Includes a subtle hairline header rule (`rgba(255,255,255,0.06)`) separating device status (Battery %, Bluetooth signal, GPS accuracy) from primary contact identity.
- Padded with `space-lg` (24px) internally to prevent accidental mis-taps on dense operational data.

### Input Fields & Controls
- **Height**: Standard 56px height.
- **Fill**: `#0D1520` with a 1.5px border of `#1B2636`. Transitions to `#C5A059` on active focus.
- **Typography**: Entered text in `#F4EFE6` (`body-lg`), persistent floating labels in `#C5A059` (`label-sm`).
- **Checkboxes & Radios**: 28px square/circle footprints with a 48px hit area wrapper; selected state uses gold tick indicator on navy fill.

### Live Telemetry Chips & Pendant Indicators
- Pill-shaped tags displaying wearers' vitals (e.g., "Online • Home Zone", "Fall Detected").
- Background: Translucent slate (`rgba(27, 38, 54, 0.85)`) framed with gold micro-borders (`#C5A059`).
- Status dots pulse with synchronized CSS glow to communicate real-time pendant synchronization.