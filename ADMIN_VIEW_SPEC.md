# Admin View Specification (Stage-1 Baseline)

## Purpose

Define exactly what "Admin view" means in this project so implementation and QA are consistent.

This spec is the source of truth for stage behavior and future migration work.

## Scope

- In scope:
  - Admin access behavior in `stage-1`
  - Admin navigation, routes, and capabilities
  - UI standards for admin-facing screens
  - Acceptance criteria for "Admin view complete"
- Out of scope:
  - Backend auth implementation
  - Production role policy changes
  - Non-admin personas (Sales/Finance/Designer) in stage

## Environment & Branch Rules

- `main` (Production): existing multi-role behavior remains available.
- `stage-1` (Preview): Admin-only operational mode.
- Any UI/feature change for this spec is implemented and validated on `stage-1` first.

## Definition: "Admin View"

Admin view means the user is operating as `Catalogue Admin` with full admin workflows available from one system.

### Access Policy

- Stage-1 must run in admin-locked mode (no runtime switching to non-admin personas).
- UI must present admin navigation and admin actions by default.

### Default Entry

- Default admin landing route: `/` (Product Catalogue).
- Dashboard route remains available at `/dashboard`.

### Admin Navigation (Required)

The following primary navigation items must be available for Admin:

1. Dashboard (`/dashboard`)
2. Products (`/`)
3. Add Product (`/products/new`)
4. Decorators (`/decorators`)
5. APPA Sync (`/appa-sync`)
6. Users (`/users`) - may be placeholder route but menu entry must exist

Stage note:
- Settings page is removed from stage navigation and stage routes.

## Functional Requirements (Admin)

## FR-1 Dashboard

- Catalogue health overview is visible.
- Quick actions route correctly to target modules.
- Incomplete/at-risk indicators are visible and actionable.

## FR-2 Product Catalogue

- Search/filter/pagination work on catalog data.
- Admin can select rows and run bulk actions.
- Bulk publish/unpublish flow is available with validation summary.

## FR-3 Product Detail

- Admin can access listing management controls.
- Publish gating blocks incomplete products.
- Readiness widgets and key detail tabs are available.

## FR-4 New Product Wizard

- Multi-step workflow is available end-to-end.
- Validation, review, and activation gating are intact.
- Pricing tiers are entered manually in Step 3 (no Settings template dependency in stage).

## FR-5 Decorator Management

- Decorator directory, filters, and row actions are available.
- Decorator profile and pricing matrix workflows are accessible.

## FR-6 APPA Sync

- Sync dashboard and conflict triage are available.
- Row-level and bulk conflict decisions are available.

## FR-7 Pricing Governance

- Pricing rules remain accessible to Admin.
- Stage does not expose Settings/Price Curve Templates as a standalone page.
- Tier configuration happens inside product creation flow (`/products/new`, Step 3).

## UI Specification

## UX Baseline

- Existing custom admin experience remains fully functional.
- React-Admin integration is additive until parity is reached.

## UI Style Decision (Locked)

- Admin UI style target is **React-Admin + MUI**.
- Stage-1 is the migration environment for this style transition.
- Existing custom screens remain only as fallback until each module reaches parity.

## React-Admin Usage Rule

- React-Admin page is exposed at `/admin-react` on stage for iterative migration.
- Do not replace existing admin routes with React-Admin until parity checklist passes.
- Once parity passes for a module, route that module to React-Admin/MUI implementation.

## Visual Direction

- Use MUI theming aligned to current brand tokens:
  - primary: `#1F5C9E`
  - background: `#F5F7FA`
  - card: `#FFFFFF`
  - border: `#DCDFE6`
  - text primary: `#1A1A1A`
  - text secondary: `#555555`

## Parity Guardrails

Any migration step (custom UI -> React-Admin) must pass all checks:

1. No admin route loss.
2. No action loss (create/edit/publish/sync/review).
3. No major data visibility regression.
4. Keyboard/mouse interaction remains usable.
5. Stage QA sign-off completed.

## Acceptance Criteria: "Admin View Ready on Stage"

Admin view is considered ready when all are true:

- Stage is admin-locked.
- Required admin navigation items are present.
- FR-1 through FR-7 are usable without blocker defects.
- `/admin-react` exists for migration testing without replacing core admin flows.
- Preview deploy reflects latest stage commit.

## Open Decisions (Track Explicitly)

- OD-1: Should `/users` be functional in stage MVP or remain placeholder?
- OD-2: At what milestone should `/admin-react` replace `/` as default admin landing?
- OD-3: Which modules migrate first to React-Admin (recommended: Products -> Decorators -> APPA)?

## Change Control

Any change to this spec must include:

- updated requirement id(s),
- branch target (`stage-1` or `main`),
- migration impact assessment (feature parity risk).

## Spec Update Enforcement

- `ADMIN_VIEW_SPEC.md` must be updated whenever admin-related code/config changes are pushed.
- Automated guardrails:
  - Local check: `npm run spec:check`
  - GitHub Action: `Admin Spec Guard` workflow on `stage-1`, `main`, and pull requests
- If admin-related files change without spec updates, the guard fails and push/PR must be corrected.
