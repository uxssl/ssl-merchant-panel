# SSLCOMMERZ Merchant Portal — Design Context

## Overview

This is the existing merchant operations prototype for reviewing payments,
stores, users, invoices, campaigns and reports. Keep its Inter typography,
blue primary actions, white surfaces and compact data tables. The icon direction
comes from the user's supplied reference: small rounded outline glyphs, muted
cool gray, and a short label below each table action.

The runtime sources remain canonical: the Tailwind theme in `index.html` owns
the brand palette; `styles.css` owns icon tokens and action styling. This document
records the intended use of those sources rather than generating another theme.

## Colors

| Role | Runtime token | Value | Use |
| --- | --- | --- | --- |
| Brand | `--color-primary-600` | `#295cab` | Primary buttons, selected navigation and focus |
| Muted icon | `--icon-color-muted` | `#96a2b1` | Icons accompanied by visible text |
| Icon-only control | `--icon-color-control` | `#7e8b9b` | Collapsed navigation, where the glyph must carry the control |
| Action label | `--icon-label-color` | `#647184` | Small text beneath table action icons |
| Hover foreground | `--icon-hover-color` | `#475569` | Table action hover, focus and open state |
| Hover surface | `--icon-hover-surface` | `#f1f5f9` | Table action hover, focus and open state |
| Pressed surface | `--icon-pressed-surface` | `#e2e8f0` | Pressed table action |

Icons inside primary buttons inherit the button's white foreground. Selected
navigation and semantic warning/success/status icons retain their established
colors. Never set a universal gray foreground on every SVG.

## Typography

Use the existing Inter font stack. Table action captions are 11px with a 14px
line height and regular weight. Preserve the visible action verb and contextual
accessible name; do not depend on an icon or tooltip alone to label a row action.

## Layout

Table actions use a 20px icon above their caption, a 2px internal gap, and a
minimum 44 by 44px click target. Dropdown triggers keep a small chevron beside
the main icon. Existing responsive table wrappers own horizontal overflow.
Longer action groups may wrap within their existing table cell.

## Elevation & Depth

Ordinary row actions and decorative navigation/report icons use transparent
backgrounds at rest. Keep existing panel and dropdown borders and elevation.

## Shapes

Use Lucide 0.475.0, already loaded by `index.html`, with a common 1.65 stroke
width in its 24-unit viewBox, rounded caps and rounded joins. Use the simple
`pencil` glyph for edit/update actions. Table action hover surfaces have 6px
corners. Logos, avatars, charts and payment QR artwork are separate assets.

## Components

| Owner | Responsibility |
| --- | --- |
| `ic()` in `js/helpers.js` | Adds `portal-icon` and decorative SVG accessibility attributes |
| `.portal-icon` in `styles.css` | Shared Lucide stroke; does not target unrelated SVGs |
| `.portal-icon-muted` / `.portal-icon-control` | Explicit neutral foreground variants |
| `rowAction()` in `js/ui.js` | Escaped attributes, native button, record identifier, icon and visible caption |
| `rowMenu()` in `pages/account.js` | Same visual styling plus existing store menu behavior |

Default, hover, focus-visible, pressed, expanded and disabled styles share the
same action geometry. Focus uses the existing visible blue outline. Disabled
buttons use the native `disabled` attribute. Hover transitions last 150ms and
are removed for reduced-motion preferences; forced-colors uses system colors.

Future table actions should call `rowAction()` rather than recreating filled
icon buttons in individual pages. Business behavior remains owned by the
existing `data-action` handlers and page state.

## Do's and Don'ts

- Use one outline family, consistent strokes and readable labels.
- Keep ordinary navigation, report and quick-action icons neutral.
- Preserve semantic colors and primary-button contrast where they communicate state.
- Do not add gradients, 3D effects, filled decorative icon tiles, or fake actions
  copied from the reference screenshot.
- Do not style the global `svg` selector; payment QR codes must remain intact.
