# UI System Redesign Spec

## Product Context

The system is a production DM script-kill store management tool. Its primary users are managers and operators who need to scan operational data, enter records quickly, import/export Excel files, calculate salaries, and trust financial totals.

## Design Direction

Use a quiet, data-dense operations interface rather than a marketing-style dashboard. The visual personality should feel like a reliable back-office command desk: clear hierarchy, restrained color, high-contrast data, and predictable controls.

Palette:

- Ink: `#10231f`
- Forest: `#1f5f4b`
- Teal: `#1f8a70`
- Amber: `#d9822b`
- Red: `#b54646`
- Paper: `#f6f7f2`
- Line: `#dfe6df`

## Scope

- Create shared layout primitives for page headers, filter toolbars, action groups, metric cards, status tags, and money text.
- Redesign the shell layout: stronger sidebar identity, compact header, safer user/password/logout area.
- Redesign Home as an operations overview with clear date scope, financial metrics, activity metrics, and trend chart.
- Apply consistent structure to DM, script, session, salary, reimbursement, and cashflow pages.
- Make tables easier to scan through density, sticky action columns, horizontal scroll, smaller action buttons, and clearer numeric formatting.
- Preserve all existing API contracts and business behavior.
- Update `CHANGELOG.md` and deploy after validation.

## UX Rules

- Filters live on the left, commands live on the right.
- Primary creation action is visually strongest; import/export and delete actions are secondary.
- Destructive actions remain red and are visually separated.
- Money values use consistent formatting and strong alignment.
- Tags are used for categories and states.
- Tables use `size="middle"` or `size="small"` and include `showTotal` pagination where useful.
- Empty states give direct next steps.
- Mobile and narrow screens stack toolbar content and preserve readable tables through horizontal scroll.

## Implementation Notes

- Keep Ant Design as the component system.
- Add a small local UI layer in `frontend/src/components/ui.js`.
- Add global visual styles in `frontend/src/styles/ui.css`.
- Import the stylesheet once from `frontend/src/index.js`.
- Refactor existing pages incrementally without changing backend routes.

## Validation

- `npm run build` in `frontend`
- Backend smoke tests remain green
- Browser visual check on desktop and mobile widths
- Verify deployed URL loads the new bundle
