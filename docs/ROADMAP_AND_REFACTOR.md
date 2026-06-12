# Roadmap and Refactor Plan

This plan preserves the existing Last Land: Empire Builder workflows, formulas, Firebase document shapes, OCR parsing behavior, and real-user data flows.

## Current Status

Completed:

- Parser, calculator, export-helper, color utility, chart utility, and fixture characterization tests.
- Sanitized fixture dataset with synthetic OCR data and one real Lord Info stat-page fixture.
- Local Firebase emulator workflow with synthetic seed data.
- Read-only charts route for recruiter-facing analytics proof.
- Shared app constants and read-only Firestore loaders.
- Production Firestore cache with development and emulator memory cache.
- Editable tower/throne Archer and Cavalry T10/T9/T8/T7 formation values.
- Admin-only guard for derived analytics writes from `AnalyticsSummary`.

## Protected Logic

Do not change these without explicit approval and regression fixtures:

- Stat parser behavior in `src/utils/parseData.js`.
- Damage score formula in `src/utils/calcs.js`.
- Report OCR cleanup and OpenCV threshold behavior in `src/components/report/ReportPage.jsx`.
- KPT/LPT and troop type aggregation behavior in `src/utils/dbActions.js` and analytics pages.
- Firestore collection and document shapes.
- Existing admin/viewer workflow.

## Safe Refactors

These are safe because they can be done behind tests without changing outputs:

- Extract report OCR cleanup into a tested utility.
- Keep report KPT/LPT helpers centralized and covered by tests.
- Extract analytics summary and troop type calculations into pure helpers.
- Extract OpenCV template matching into a browser-only service module.
- Keep adding sanitized fixture coverage before moving code.
- Add empty/loading/error states for data-heavy pages.
- Improve mobile table scanability and page spacing.

## UI Direction

Recruiters should understand the achievement quickly:

- Keep the app first-screen focused on OCR, reports, formations, analytics, and data safety.
- Show admin/viewer mode clearly.
- Keep charts read-only and sourced from existing Firebase docs.
- Avoid decorative UI that hides the real engineering depth.
- Add concise architecture and data-safety language in the app and docs.

## Performance and Caching

Completed:

- Route pages lazy-load from `App.js`.
- Navigation tabs prefetch route chunks on hover or keyboard focus.
- Firestore production reads use persistent local SDK cache with multi-tab coordination.
- Development and emulator modes use memory cache to avoid stale local fixture data.

Next:

1. Add bundle analysis after build modernization.
2. Move OpenCV and large browser-only OCR helpers behind route or action-level dynamic imports.
3. Replace CRA with Vite after report extraction and analytics calculations are fixture-covered.
4. Add Lighthouse checks for public/recruiter pages and authenticated workflow pages separately.

## SSR Decision

Full SSR is not the right first migration for this authenticated Firebase/OpenCV app.

Recommended path:

1. Keep authenticated Firebase workflows client-rendered.
2. Use SSR or SSG only for public recruiter-facing case-study pages if this app becomes public.
3. Migrate CRA to Vite before considering Next.js.
4. Keep Firebase browser-only code behind client-only boundaries before any SSR migration.

SSR benefits:

- Better public landing-page SEO.
- Faster static case-study pages.
- Strong senior-engineering story if documented and tested.

SSR risks:

- Authenticated dashboards gain limited value from SSR.
- OpenCV and image processing still require the browser.
- Next.js migration could distract from the stronger proof: OCR, parsing, Firebase, analytics, and safety around real data.

## Roadmap

### Phase 1: Lock Current Behavior

Status: mostly complete.

- Keep parser and calculator characterization tests passing.
- Keep fixture tests passing.
- Add tests before changing any production-sensitive logic.

### Phase 2: Fixture Dataset

Status: in progress.

- Add more sanitized Lord Info stat pages.
- Add real battle report OCR text fixtures.
- Add expected analytics KPT/LPT outputs.
- Keep screenshots with sensitive player data out of the repo unless sanitized.

### Phase 3: Admin and Security Hardening

- Review Firestore security rules.
- Move admin authorization from hardcoded emails toward custom claims or Firestore role documents.
- Keep old and new authorization paths in parallel during rollout.

### Phase 4: Extraction Review UX

- Add confidence and review metadata around extraction output.
- Add manual correction flow before saving report data.
- Compare deterministic parser output with any AI proposal before saving.

### Phase 5: Platform Modernization

- Migrate CRA to Vite after fixtures cover report extraction and analytics.
- Convert modules to TypeScript one boundary at a time.
- Keep Firebase and OpenCV browser-only code isolated.

### Phase 6: Optional AI Normalization

Use LLMs only after OCR, and only as a proposal layer:

1. OCR returns raw text.
2. Existing deterministic parser creates baseline output.
3. LLM proposes normalized JSON.
4. The app compares both outputs.
5. Admin reviews differences before saving.

The LLM should not become the silent source of truth for real data.

## Known Issues To Investigate

- Negative Damage Received values currently lose their minus sign and are treated as positive.
- Analytics summary writes should be fixture-tested against expected Firestore document shapes.
- Some app status text has encoding artifacts and should be cleaned after behavior tests remain green.
