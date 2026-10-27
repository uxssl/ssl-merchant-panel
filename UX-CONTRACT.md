# Icon and Table Action Contract

This contract covers the shared icon refinement. The project is a client-side
merchant portal prototype; this document does not define production permissions,
payment processing rules or new workflows.

## Sources and ownership

The user's reference establishes the icon appearance. `DESIGN.md` documents its
runtime mapping. Existing handlers in `js/app.js`, state in `js/state.js` and
page-specific functions remain the evidence for current prototype behavior.

| Capability | Canonical owner | Contract |
| --- | --- | --- |
| SVG icon | `ic()` and `.portal-icon` | Decorative SVG; its surrounding control supplies its name |
| Table action | `rowAction()` and `.row-action` | Native button with visible caption and contextual accessible name |
| Store action menu | `rowMenu()` | Existing `dd-toggle` key, expanded state and menu items remain intact |
| Navigation icon | `navItem()` | Selected route retains brand color; collapsed controls have an accessible name |
| Action dispatch | Existing delegated `data-action` handlers | Preserve action names, record values and visibility conditions |

## Interaction rules

- Opening Details still opens the same record's drawer.
- Edit/Update still opens the existing edit form; the icon change does not save data.
- Store View/Settings triggers still open their existing menus.
- Download, Resend, Cancel and Ticket keep their existing action identifiers and conditions.
- Native buttons support click and keyboard activation. Visible focus remains
  available. Disabled actions use the native `disabled` attribute.
- Visible row captions remain readable independently of the lighter decorative glyphs.
- Retain selected navigation, primary button contrast and meaningful status colors.

## Verification scope

Check JavaScript syntax and diff whitespace, render representative account,
transaction, product and campaign pages, exercise Details/Edit/menu actions,
and inspect a narrow viewport. Verify that Lucide icons render with the shared
stroke while unrelated QR SVGs retain their original appearance.

This icon-only change does not claim a complete accessibility audit or production
CRUD, security, locale, persistence or backend validation coverage.
