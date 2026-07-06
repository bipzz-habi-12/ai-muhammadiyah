---
name: Sang Surya Design System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3f4940'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6f7a70'
  outline-variant: '#bec9be'
  surface-tint: '#0b6d3b'
  primary: '#004d27'
  on-primary: '#ffffff'
  primary-container: '#006837'
  on-primary-container: '#8ee4a6'
  inverse-primary: '#83d99c'
  secondary: '#785900'
  on-secondary: '#ffffff'
  secondary-container: '#fdc003'
  on-secondary-container: '#6c5000'
  tertiary: '#2f3891'
  on-tertiary: '#ffffff'
  tertiary-container: '#4851aa'
  on-tertiary-container: '#cbceff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9ef6b6'
  primary-fixed-dim: '#83d99c'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#00522a'
  secondary-fixed: '#ffdf9e'
  secondary-fixed-dim: '#fabd00'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#e0e0ff'
  tertiary-fixed-dim: '#bdc2ff'
  on-tertiary-fixed: '#000767'
  on-tertiary-fixed-variant: '#343d96'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  code:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin: 32px
---

## Brand & Style
The design system is built to facilitate intellectual exploration and focused productivity. It draws inspiration from the minimalism of high-end developer tools and the clarity of modern research platforms. The aesthetic is "Document-Centric Minimalism"—where the interface recedes to let content and thought take center stage.

The style avoids the heavy shadows of skeuomorphism or the harshness of brutalism. Instead, it utilizes high-quality typography, generous whitespace, and precise alignment to communicate authority. The "Sang Surya" motif is integrated as a subtle, low-opacity radial background treatment to symbolize enlightenment without distracting the user from their cognitive tasks.

## Colors
The palette is grounded in a deep "Muhammadiyah Green," used strategically for primary actions and brand presence. The "Amber Gold" acts as a high-intent accent, signifying discovery and insight. 

*   **Primary (#006837):** Used for primary buttons, active navigation states, and key brand identifiers.
*   **Secondary Amber (#FFC107):** Reserved for highlights, notifications of insight, and subtle "spark" iconography.
*   **Structural Blue (#1A237E):** Utilized for deep-tier navigation, code blocks, or data-heavy research labels.
*   **Surface:** The background remains a pure white (#FFFFFF) to maintain a "blank canvas" feel, with a very light neutral gray (#F8F9FA) used for secondary containers and sidebars.

## Typography
Typography follows a systematic hierarchy designed for long-form reading and technical research. **Inter** provides a highly legible, neutral foundation for all UI and document body text. 

For technical metadata and labels, **Geist** is introduced to provide a clean, monospaced-adjacent feel that aids in scanning data and research citations. High-level headings use tight letter-spacing to appear more cohesive, while body text maintains standard spacing for maximum accessibility.

## Layout & Spacing
The layout uses a **fixed-fluid hybrid grid**. The central content area (the "Document") is constrained to a readable width (max-width: 800px) to ensure optimal line lengths for research papers and AI responses. 

Sidebars for navigation and supplementary tools are fixed-width but can be collapsed. 
*   **Desktop:** 12-column grid with 24px gutters.
*   **Tablet:** 8-column grid with 16px gutters.
*   **Mobile:** 4-column grid with 16px margins. 

Spacing follows a strict 4px/8px baseline to maintain a rhythmic, systematic structure throughout the interface.

## Elevation & Depth
This design system uses **Tonal Layers** rather than heavy shadows to denote depth. 
*   **Level 0 (Background):** Pure White (#FFFFFF).
*   **Level 1 (Sidebars/Surfaces):** Off-white (#F8F9FA) with a 1px soft border (#E9ECEF).
*   **Level 2 (Modals/Popovers):** Pure White with a very soft, high-diffusion shadow (0px 4px 20px rgba(0, 0, 0, 0.04)) to suggest floating.

The design relies on "hairline" borders (1px) in light grays to define sections, maintaining a crisp, paper-like aesthetic.

## Shapes
Shapes are intentionally friendly yet professional. We utilize a "Rounded" (Level 2) configuration to soften the technical nature of the platform.
*   **Standard Components:** 0.5rem (8px) for buttons and inputs.
*   **Cards/Containers:** 1rem (16px) to create a distinct enclosure for content blocks.
*   **Large Modals:** 1.5rem (24px) for a modern, approachable feel.

## Components
*   **Buttons:** Primary buttons are solid Muhammadiyah Green with white text. Secondary buttons are ghost-style with a 1px gray border.
*   **Input Fields:** Minimalist design—white background, 1px light gray border, transitioning to a primary green border on focus. No heavy inner shadows.
*   **Cards:** Defined by a 1px border (#E9ECEF) and 16px corner radius. No background fill unless used for a "highlighted" research finding.
*   **Chips:** Used for research tags or categories. Small 4px corner radius, light gray background (#F1F3F5), and Geist Label-MD typography.
*   **The AI Chat Interface:** Uses a "Message-Stream" layout where the AI's responses are set against a subtle, ultra-light green background to distinguish them from user prompts.
*   **Citations:** Small, superscript-style numbers in Structural Blue (#1A237E) that link to a sidebar bibliographical reference.