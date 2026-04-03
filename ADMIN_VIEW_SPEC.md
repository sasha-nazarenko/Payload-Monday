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
- Catalogue health route remains available at `/dashboard` (sidebar label matches the page title).

### Admin Navigation (Required)

The following primary navigation items must be available for Admin:

1. Catalogue health (`/dashboard`) — core KPI cards, incomplete-products queue, **APPA sync status in the page header**, and conflict resolution (single page).
2. Products (`/`)
3. Decorators (`/decorators`)
4. Settings (`/settings`) — **default price tiers** only: a single editable MOQ / unit-cost ladder (no named templates, no duplicate flow). Persisted for the catalogue; new products load this ladder as the Step 3 starting point.

- Legacy URL `/appa-sync` redirects to `/dashboard?focus=appa` (scrolls to the APPA sync block in the page header).

## Functional Requirements (Admin)

## FR-1 Catalogue health (`/dashboard`)

- Core KPI cards are visible (active products, pending review, APPA conflicts, quoted products).
- In the main content (below KPIs), **Work queues** appears as a single card with a **segmented control** (two equal segments) for **incomplete products** and **APPA conflicts**, each with a compact numeric count badge. Only **one** queue table is visible at a time; the control switches the active panel and indicates selection.
- The active table scrolls inside a fixed-height area with a **sticky header** to limit long page scroll.
- APPA **monitoring** (last run summary, manual sync trigger) lives in the **catalogue health page header** beside the title—with a **bounded width** on wide screens so the title and intro copy stay fully visible (the sync strip does not stretch to full row width). **Conflict triage** (filter tabs and **per-row** resolve actions only) stays in Work queues on the same page; the incomplete-products queue uses **per-row** actions only (no row multi-select or bulk bar). Conflict count in KPIs stays consistent with the unresolved queue.

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
- **Default pricing tiers** from **Settings** (`/settings`) seed Step 3 when starting **Add Product**; tiers remain fully editable in the wizard.
- **Pricing & Tiers (Step 3)** must render without runtime errors; tier min/max/unit cost inputs are always editable, and the preview tier index stays in range when tiers are added or removed.
- **Freight (Step 3)**: For **APPA** product type, shipping lines from the feed (e.g. per-order “Shipping & Handling”) are shown read-only; the sell-price preview amortises that per-order amount over the selected tier’s representative quantity. For **non-APPA** types (standard, bespoke, proposal-only), admins configure **Freight Allocation** manually (supplier-is-decorator toggle and per-unit leg fields).
- **Assets (Step 4)**: **Website** tile, hover, and variant images are optional unless **Live on website** is enabled; enabling live requires all three slots to have at least one uploaded file (the toggle cannot stay on if requirements are not met, and removing a required image turns live off). **Proposal-only** products require at least one **blank** product image (validation error if missing). Decoration method assets remain per method in Step 4.
- **Bespoke add-ons (Step 2 + Step 3)**: Add-on options are named in Step 2; **$/unit per add-on is captured for each MOQ / base-cost tier** in Step 3 so add-on cost scales with the same quantity breaks as the base product. Adding or removing tiers updates add-on tier columns; sell-price preview includes combined bespoke add-ons for the selected tier.

## FR-5 Decorator Management

- Decorator directory, filters, and row actions are available.
- Decorator profile and pricing matrix workflows are accessible.

## FR-6 APPA Sync

- **Location:** Sync monitoring appears in the **catalogue health page header** on `/dashboard` (not a separate primary nav item). `/appa-sync` redirects with `?focus=appa` (scroll/focus that header block).
- Conflict triage remains in Work queues on the same page.
- Row-level conflict decisions are available (no bulk / multi-select on the dashboard tables).

## FR-7 Pricing Governance

- Pricing rules remain accessible to Admin.
- **Settings** (`/settings`) exposes **one** global default tier ladder (no multi-template list, no duplicate). Changes are not retroactive to existing products.
- Tier configuration is refined inside product creation (`/products/new`, Step 3) starting from that default.

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

- OD-1: Users is omitted from stage admin navigation; should `/users` remain reachable (direct URL) as placeholder or be removed?
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
