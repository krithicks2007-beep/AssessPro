# AssessPro Final Audit

Audit date: 2026-09-29

Remediation update: a security/deployment fix pass was applied after this audit. The findings below document the original defects; see the verification and remaining actions at the end for the current state.

Scope: all tracked application, configuration, SQL, deployment, utility, and documentation files in this repository. `node_modules` and generated build output were excluded. The working tree was already not clean when this audit started: `backend/package.json` and `backend/package-lock.json` contain an uncommitted `pg` dependency change, and `bugs.md` is untracked. Those changes were not modified.

## Release Decision

**Do not deploy this version to production.** The frontend can be bundled, but the current application has critical authorization failures, unrestricted database policies, server-side identity spoofing, and an API implementation that can crash on reachable admin/delete paths. Vercel configuration also needs to be simplified and validated as one deployment model.

The highest-risk issue is not a cosmetic bug: a request without a valid bearer token is converted into a demo user, and the protected endpoints do not enforce the user role or ownership. Combined with permissive Supabase RLS policies, an unauthenticated caller can read and mutate institutional data.

## Findings

### F-001 — Critical: authentication is bypassed by design

**Files:** `backend/server.js:78-103`

`verifyAuth` calls `next()` and assigns `demo-user-id` whenever the request has no bearer token, contains a `mock-*` token, Supabase is unavailable, or Supabase rejects the token. This is used on write and admin routes. A missing, expired, malformed, or invalid token therefore does not produce `401 Unauthorized`.

**Impact:** anyone who can reach the API can act as an authenticated caller. If Supabase credentials are misconfigured, the entire protected API silently enters demo mode.

**Fix:** reject missing and invalid tokens with `401`; never convert production requests into a demo identity. Keep demo mode behind an explicit local-only flag that cannot be enabled in Vercel.

### F-002 — Critical: no role or ownership authorization exists

**Files:** `backend/server.js:217-234`, `524-580`, `758-856`, `934-1057`, `1182-1310`

The middleware only identifies a user; it does not verify that the caller is an admin, staff member, test owner, or the student named in the request. Admin routes, group writes, test writes/deletes, reset, staff assignment, and profile writes are all callable after the bypass in F-001. Several read routes do not use `verifyAuth` at all.

**Impact:** privilege escalation, deletion of tests/users, database reset, arbitrary role changes, and access to other students' profiles/submissions.

**Fix:** add explicit `requireAuth`, `requireRole('admin')`, `requireRole('staff')`, and resource-owner checks. Derive user id/email from the verified token, never from request body/query values.

### F-003 — Critical: Supabase RLS policies allow every operation to everyone

**Files:** `backend/schema.sql:105-119`, `backend/migration_v2.sql:48-66`, `backend/fix_rls.sql:9-42`

The policies use `USING (true)` and `WITH CHECK (true)` for users, students, staff, groups, tests, submissions, and staff requests. The browser also connects directly to Supabase in `frontend/src/supabaseClient.js`, so these policies are an independent public write path that bypasses the Express API.

**Impact:** any browser with the public anon key can read, insert, update, or delete all application data. The database does not enforce the role boundaries claimed by the UI.

**Fix:** replace with `auth.uid()`-based policies for self profiles, staff-owned tests, assigned student submissions, and admin-only operations. Keep the service-role key server-side only and remove direct browser writes unless their RLS rules are complete.

### F-004 — Critical: client-controlled identity and grading data

**Files:** `backend/server.js:1059-1137`, `frontend/src/components/student/TestTakingModal.jsx:100-151`

`POST /api/tests/:id/submit` accepts `studentEmail`, `studentName`, `score`, `correct_count`, `total_questions`, and `max_score` from the request. The server only grades from questions when `clientScore` is absent; otherwise it trusts the submitted score. It also accepts any student email and does not compare it with the authenticated user.

**Impact:** a student can submit on behalf of another student, change their score, or submit multiple times for any test. The supposedly authoritative server grading is not authoritative.

**Fix:** derive student identity from the verified session, load the test server-side, ignore client score/correct-count/max-score fields, validate the test window and assignment, grade only from stored questions, and enforce one submission with a database constraint/transaction.

### F-005 — High: correct answers are exposed to students

**Files:** `backend/server.js:858-932`, `frontend/src/api.js:344-430`

The test list and single-test endpoints return the complete `questions` JSON, including each question's `correct_index`. Student-facing code consumes the same response used by staff.

**Impact:** a student can inspect the network response before submitting and obtain every answer.

**Fix:** return a student-safe question projection without answer keys. Return `correct_index` only to grading code on the server and to authorized staff after submission.

### F-006 — High: admin endpoints are publicly reachable

**Files:** `backend/server.js:524-580`, `1182-1310`

Admin list, approve/reject, role update, user deletion, and database reset routes use `verifyAuth` but no admin check. The frontend's `currentRole` and the super-admin switcher are client state and are not a security boundary (`frontend/src/App.jsx:211-225`, `265-329`).

**Impact:** a caller can promote users, approve staff, delete accounts, or reset data by calling the API directly.

**Fix:** authorize admin operations from a database role attached to the verified Supabase user. Do not trust email prefixes or a client-selected view.

### F-007 — High: reachable backend paths reference undeclared variables

**Files:** `backend/server.js:383`, `1277-1283`

`inMemoryStudentProfiles`, `inMemoryStaffRequests`, `studentStaffAssignments`, `inMemorySubmissions`, `saveStaffRequestsToFile`, `saveMappingToFile`, and `saveSubmissionsToFile` are referenced but never declared or imported in the current server file. The import check passes only because those branches are not executed during module loading.

**Impact:** user-profile cleanup and admin user deletion can throw `ReferenceError` and return 500 after partially deleting records. This is especially dangerous because the deletion is not transactional.

**Fix:** remove the obsolete file/in-memory cleanup code now that the server is intended to be Supabase-only, or define a single durable repository layer and use transactions/compensating operations.

### F-008 — High: Google OAuth does not enforce the claimed domain restriction

**Files:** `frontend/src/supabaseClient.js:51-65`, `frontend/src/components/shared/ConfigModal.jsx:80-91`

The code comment says it passes `hd: bitsathy.ac.in`, but `signInWithGoogleBitsathy` only sends `prompt` and `access_type`. The `hd` query parameter is absent. External users are then intentionally offered Student/Staff role selection in `RoleSelectionModal.jsx:200-281`.

**Impact:** the UI and README claim institutional-only authentication while the implementation permits external accounts into the application flow. Domain hints are not a sufficient authorization control anyway.

**Fix:** enforce the email domain after Supabase verifies the identity, and reject non-institutional users unless an explicit, server-side approval workflow is intended. Treat Google `hd` only as a UX hint.

### F-009 — High: anonymous and cross-user data reads

**Files:** `backend/server.js:177-210`, `586-615`, `662-684`, `858-932`, `906-932`, `1141-1180`

Student lists, profiles by arbitrary email, tests, test details, test submissions, and student submissions are available without authentication. Query parameters such as `email`, `student_email`, and `staff_id` are accepted directly from the caller.

**Impact:** exposure of names, emails, profile details, questions/answers, grades, and staff assignment data.

**Fix:** require authentication on every non-health route, derive the target from the session, and enforce staff/admin scope for bulk and submission reads.

### F-010 — High: wildcard CORS exposes the API to any origin

**Files:** `backend/server.js:12`

`cors()` permits every origin, while the API performs privileged database operations.

**Impact:** any website can issue browser requests to the API if the caller has credentials or can exploit the demo fallback; this also makes accidental cross-origin use harder to detect.

**Fix:** allow only the production frontend origin and local development origins from an environment variable. Add explicit methods/headers and do not use wildcard credentials.

### F-011 — High: conflicting Vercel deployment definitions

**Files:** `vercel.json`, `frontend/vercel.json`, `backend/vercel.json`, `api/index.js`

There are three Vercel configurations with different routing models. The root config builds `api/index.js` and `frontend/package.json`, then routes all non-API paths to `/frontend/$1`; the frontend config rewrites every path to `/index.html`; the backend config routes every path to `server.js`. The repository README still describes a separate local proxy and does not document a production API origin.

**Impact:** deployment behavior depends on which directory is selected as the Vercel project root. SPA deep links, static assets, and `/api` routing can work locally but fail after deployment.

**Fix:** choose one model: either one root Vercel project with one root `vercel.json`, or two Vercel projects with a documented frontend API URL and CORS policy. Test `/`, a deep client route, static assets, `/api/health`, and an authenticated API call after deployment. Remove unused nested configs.

### F-012 — High: schema and migration execution is order-dependent and not repeatable

**Files:** `backend/schema.sql`, `backend/migration_v2.sql`, `backend/migration_supabase_only.sql`, `backend/fix_rls.sql`

`schema.sql` creates policies without `DROP POLICY IF EXISTS`, so rerunning it can abort on existing policies. The server writes fields such as `created_by_email`, `uploaded_file_name`, and `test_number` that are added only by `migration_supabase_only.sql`. There is no migration runner or recorded required order.

**Impact:** a fresh Supabase project and an existing project can have different schemas. Test creation may fail because columns are missing, or a setup script may stop halfway through.

**Fix:** use one ordered, repeatable migration path, make every migration idempotent, add constraints/indexes, and record the exact deployment setup in the README or Supabase migrations directory.

### F-013 — High: serverless state is not durable

**Files:** `backend/server.js:17`, `backend/server.js:63-65`, `backend/server.js:469-477`, `backend/server.js:545`, `backend/server.js:577`

Role overrides are held in a process-local `Map`. Vercel functions can cold start or run on multiple instances, so approval/student-selection state disappears or differs between requests. The old file persistence references in F-007 are not a usable replacement on Vercel.

**Impact:** a user may be approved in one invocation and appear unassigned in another; behavior will be intermittent in production.

**Fix:** persist role state only in Supabase and query it on every request. Remove process-local authorization state.

### F-014 — High: service-role/anon key fallback is unsafe and operationally ambiguous

**Files:** `backend/server.js:20-25`, `backend/server.js:550-563`, `1261-1267`

The backend uses `SUPABASE_SERVICE_ROLE_KEY` when present but silently falls back to `SUPABASE_ANON_KEY`. Admin Auth API calls require a service-role context and should never be attempted with an anon key. If neither key is present, the app enters the demo identity path.

**Impact:** admin operations fail unpredictably, or a configuration mistake changes security behavior rather than failing closed.

**Fix:** require the service-role key for server startup in production, use the anon key only in the browser, validate all required environment variables, and fail closed with a health failure rather than demo mode.

### F-015 — High: sensitive data and tokens are stored in browser localStorage

**Files:** `frontend/src/api.js:38-44`, `frontend/src/App.jsx:35-40`, `frontend/src/supabaseClient.js:3-24`, `frontend/src/api.js:124-124`, `603-749`

The Supabase access token, profiles, submissions, role state, custom groups, custom tests, and configuration keys are stored in localStorage. Any XSS or compromised third-party script can read the bearer token and all cached data.

**Impact:** account takeover and exposure of assessment records. Local cache can also show stale or fabricated results when the backend is unavailable.

**Fix:** let Supabase manage its session storage, consider an HttpOnly server session for the API, minimize cached PII/grades, and never treat localStorage fallback data as authoritative production data.

### F-016 — High: frontend silently falls back to fake/local data after backend failures

**Files:** `frontend/src/api.js:95-186`, `238-258`, `433-543`, `545-684`, `908-979`

Most API methods catch network/database errors and then read or write localStorage, direct Supabase, or fabricated defaults. A failed server mutation can therefore look successful in the UI while not being persisted centrally.

**Impact:** teachers and students can see different tests, assignments, grades, or profiles. Operational failures are hidden and data loss is likely.

**Fix:** use one production persistence path; show an error when it fails. Keep offline/demo adapters separate from production and behind an explicit development feature flag.

### F-017 — High: conditional React Hooks violation breaks staff onboarding

**File:** `frontend/src/components/staff/StaffOnboardingModal.jsx:30-57`

The component returns before calling its hooks when `isOpen` is false, then calls multiple `useState` hooks and `useEffect` when it becomes true. This violates the Rules of Hooks and is reported as 11 lint errors.

**Impact:** staff onboarding can fail at runtime or produce inconsistent hook state when the modal opens/closes. CI/deployment quality gates also fail.

**Fix:** move all hooks into an inner component, as already done in `StudentOnboardingModal.jsx`, or call hooks unconditionally before branching.

### F-018 — Medium: submission timing and exam rules are only client-side

**Files:** `frontend/src/components/student/TestTakingModal.jsx:185-258`, `backend/server.js:1059-1137`

The browser controls fullscreen, timer, tab-switch counts, start/end UI, and auto-submit. The backend does not validate the test's start/end window, assignment, duration, or tab-switch values. `tabSwitchCount` and `timeTakenSeconds` are client-controlled.

**Impact:** students can bypass deadlines, submit tests they were not assigned, and forge integrity metrics. Browser focus/fullscreen events are not reliable proctoring controls.

**Fix:** validate all eligibility and timing server-side using server timestamps. Treat tab-switch data as advisory and label it accordingly.

### F-019 — Medium: hard-coded role and admin rules are unsafe

**Files:** `backend/server.js:51-69`, `frontend/src/utils/studentParser.js:99-105`, `frontend/src/App.jsx:211-225`

The master admin email is hard-coded, and any email starting with `admin` or `dean` can resolve to admin in the backend resolver. The frontend also identifies master accounts with `clean.startsWith('admin')`. Email naming patterns are not authorization.

**Impact:** unintended privileged accounts and an expensive future migration when institutional naming changes.

**Fix:** store roles in a protected database table/claim, bootstrap one admin through a deployment-time secret or explicit database operation, and remove heuristic elevation.

### F-020 — Medium: SQL trigger creates guessed student/staff data

**File:** `backend/schema.sql:133-180`

The auth trigger creates profile records and synthetic registration/staff codes from email patterns and hashes. Institutional users are auto-assigned roles based on regexes, and the frontend also predicts department, year, registration number, and date of birth.

**Impact:** incorrect academic records and privacy/compliance risk. A guessed registration number must not be treated as verified identity.

**Fix:** collect and verify official profile data, or integrate with an authoritative institutional directory. Keep inferred values visibly provisional and never use them for authorization.

### F-021 — Medium: errors expose backend details

**Files:** `backend/server.js:155`, `177-210`, `617-725`, `934-1057`, `1141-1180`, `1182-1310`

Many responses return `err.message` or `details` directly. These messages can contain SQL/RLS/provider information and internal implementation details.

**Fix:** log detailed errors server-side with a request id and return stable, generic production error messages.

### F-022 — Medium: no automated test suite or API contract tests

**Files:** `backend/package.json:1-18`, repository-wide

The backend has no test script or tests. There are no authorization, RLS, grading, migration, serverless, or end-to-end tests. Frontend lint currently fails. The direct production build passes but only verifies bundling.

**Fix:** add API tests for every role and unauthenticated request, database policy tests, grading/time-window tests, migration smoke tests, and a browser smoke test for login, staff onboarding, test creation, student submission, and admin actions.

### F-023 — Low: production bundle is too large for a single initial chunk

**Evidence:** direct Vite build warning; generated JS is approximately 1.1 MB minified and the PDF worker is approximately 1.27 MB.

**Impact:** slower first load and higher mobile failure risk.

**Fix:** lazy-load role dashboards and PDF parsing, split the worker, and measure real-world performance before launch.

### F-024 — Low: lint warnings and stale/dead code obscure real defects

**Files:** `frontend/src/api.js`, `frontend/src/supabaseClient.js`, multiple dashboard/profile components

The lint run reports numerous unused imports/variables, ignored errors, impure render-time values, and state updates from effects. `ConfigModal` imports unused symbols, `LoginPage` has unused email-login imports/props, and there are multiple duplicated direct-Supabase/API/localStorage implementations.

**Fix:** make lint clean, remove dead fallback paths, and keep each data operation in one module.

### F-025 — Low: repository contains stale and potentially sensitive operational artifacts

**Files:** `backend/data/staff_requests.json.1790612271696.tmp`, `backend/scripts/purge_all_except_superadmin.js`, `frontend/src/assets/react.svg`, `frontend/src/assets/vite.svg`, `frontend/README.md`

The temporary JSON file contains a real-looking pending email record. The purge script still writes legacy JSON files even though the server claims to be Supabase-only. The frontend README is the stock Vite README and does not document this application.

**Fix:** remove temporary/runtime artifacts, review git history for personal data, keep destructive maintenance scripts out of the deployment package or protect them carefully, and replace the stock README with the actual setup/run/deploy documentation.

## File-by-File Review Map

### Deployment and root files

- `package.json`: monorepo development scripts; does not provide a production build/start contract for the root Vercel project.
- `package-lock.json`: root dependency lockfile; should be kept synchronized with the root package.
- `vercel.json`: combined frontend/function build and routing definition; conflicts with nested Vercel configs and needs one validated model.
- `README.md`: describes the intended split architecture and local proxy, but omits production environment variables, Supabase setup order, security requirements, and final Vercel routing.
- `bugs.md`: untracked pre-existing issue notes; not used as the final audit source.

### Backend files

- `api/index.js`: Vercel adapter dynamically imports and returns the Express app; depends on the root Vercel config and backend environment variables.
- `backend/server.js`: Express API, Supabase client, role resolution, profiles, groups, tests, submissions, and admin routes; contains F-001 through F-021.
- `backend/package.json`: server dependencies and dev/start scripts; no tests; `pg` is present in the current uncommitted change but is not imported by `server.js`.
- `backend/package-lock.json`: dependency lockfile; currently modified with the `pg` addition.
- `backend/.env.example`: documents Supabase URL, service-role key, and allowed domain; production must use Vercel environment variables, never committed `.env` files.
- `backend/.gitignore`: ignores environment files and generated artifacts appropriately.
- `backend/vercel.json`: alternate standalone backend deployment definition; conflicts with the root deployment definition.
- `backend/schema.sql`: base schema, permissive RLS, auth trigger, and synthetic profiles; contains F-003, F-012, and F-020.
- `backend/migration_v2.sql`: adds role/test/submission fields and permissive RLS; must not be used as the final security policy.
- `backend/migration_supabase_only.sql`: adds server-used fields and staff-request table; lacks a migration framework/order.
- `backend/fix_rls.sql`: explicitly opens groups, tests, and submissions to all callers; critical security issue.
- `backend/scripts/purge_all_except_superadmin.js`: destructive Supabase admin cleanup plus obsolete JSON-file cleanup; no package command or safety confirmation.
- `backend/data/staff_requests.json.1790612271696.tmp`: temporary runtime artifact containing a pending email; should not ship.

### Frontend files

- `frontend/src/main.jsx`: mounts React StrictMode and the global error boundary.
- `frontend/src/App.jsx`: owns Supabase session state, role selection, demo identity, dashboard selection, and onboarding; client state is not authorization.
- `frontend/src/api.js`: API client with token localStorage and extensive fallback-to-localStorage/direct-Supabase behavior; contains F-004, F-015, and F-016.
- `frontend/src/supabaseClient.js`: browser Supabase client, OAuth, direct CRUD helpers, localStorage configuration, profile persistence, and inferred roles; contains F-003, F-008, F-015, and F-020.
- `frontend/src/App.css`: application visual styles; no deployment logic.
- `frontend/src/index.css`: global/layout styles; no backend protections.
- `frontend/vite.config.js`: local port and `/api` proxy to `localhost:5000`; proxy does not apply in production.
- `frontend/index.html`: Vite document shell, favicon, title, and metadata.
- `frontend/.env.example`: public Supabase URL/anon key/domain variables; must be set in the Vercel frontend project.
- `frontend/.gitignore`: ignores env files and build output.
- `frontend/vercel.json`: SPA rewrite for a standalone frontend deployment; conflicts with the root config when deploying from the repository root.
- `frontend/package.json`: React/Vite/Oxlint scripts and dependencies; build works, lint fails.
- `frontend/package-lock.json`: frontend dependency lockfile.
- `frontend/README.md`: stock Vite documentation; not sufficient for this application.
- `frontend/.oxlintrc.json`: enables React/Oxc lint rules and exposes the Hooks violation in F-017.
- `frontend/src/components/admin/AdminLayout.jsx`: admin dashboard and user/staff-request actions; relies on insecure API authorization.
- `frontend/src/components/auth/LoginPage.jsx`: email/password and Google login UI; email-login import and demo prop are unused.
- `frontend/src/components/auth/RoleSelectionModal.jsx`: external-user Student/Staff choice and polling; role choice must be server-authorized.
- `frontend/src/components/auth/AuthErrorModal.jsx`: authentication error presentation.
- `frontend/src/components/shared/ErrorBoundary.jsx`: displays raw component error details to the user.
- `frontend/src/components/shared/ConfigModal.jsx`: saves Supabase URL/anon key in localStorage and documents a domain hint that the OAuth code does not send.
- `frontend/src/components/shared/CircleRing.jsx`: progress-ring presentation component.
- `frontend/src/components/staff/StaffLayout.jsx`: staff shell, tabs, test/student/profile loading, and onboarding; protected only by client role state.
- `frontend/src/components/staff/StaffOnboardingModal.jsx`: staff profile form; conditional Hooks violation in F-017.
- `frontend/src/components/staff/StaffProfile.jsx`: staff profile presentation/editing; has unused imports reported by lint.
- `frontend/src/components/staff/Dashboard.jsx`: staff metrics and dashboard presentation.
- `frontend/src/components/staff/Groups.jsx`: group list and CRUD UI; writes rely on insecure API/RLS.
- `frontend/src/components/staff/Students.jsx`: student directory and assignment UI; reads/assignments rely on email query parameters.
- `frontend/src/components/staff/Tests.jsx`: staff test list/actions.
- `frontend/src/components/staff/ConfigureTestPage.jsx`: question upload/parsing and test configuration; client validation must be repeated server-side.
- `frontend/src/components/staff/ViewSubmissionsModal.jsx`: submission list/analytics; data access must be staff-scoped.
- `frontend/src/components/student/StudentLayout.jsx`: student shell, tests, tasks, results, and profile state.
- `frontend/src/components/student/StudentOnboardingModal.jsx`: student profile form and inferred defaults.
- `frontend/src/components/student/Dashboard.jsx`: student analytics and group performance presentation.
- `frontend/src/components/student/Profile.jsx`: student profile presentation.
- `frontend/src/components/student/Results.jsx`: student results presentation.
- `frontend/src/components/student/Tasks.jsx`: task list presentation.
- `frontend/src/components/student/Tests.jsx`: available-test list and launch UI.
- `frontend/src/components/student/TestTakingModal.jsx`: client timer/fullscreen/tab-switch tracking, client score calculation, and submission; contains F-004 and F-018.
- `frontend/src/utils/pdfParser.js`: browser PDF text extraction used by question upload; increases bundle size and needs malformed/large-file limits.
- `frontend/src/utils/studentParser.js`: email-pattern role/name/department/year/registration inference; contains F-019 and F-020 concerns.
- `frontend/src/assets/hero.png`: bundled image asset.
- `frontend/src/assets/react.svg`, `frontend/src/assets/vite.svg`: leftover template assets.
- `frontend/public/favicon.svg`, `frontend/public/icons.svg`: public static icons.

## Vercel Deployment Requirements

Before deployment:

1. Choose one project layout. The simplest single-project layout is root `vercel.json`, root `api/index.js`, and a frontend build whose output/routing is verified from the deployed URL. Otherwise deploy `frontend/` and `backend/` separately and set a production `VITE_API_URL` plus CORS allowlist.
2. Set frontend variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ALLOWED_DOMAIN`.
3. Set backend variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ALLOWED_DOMAIN`. Never expose the service-role key through a `VITE_` variable.
4. Apply one clean, ordered Supabase migration. Replace all permissive policies and add uniqueness/indexes for test ownership and submissions.
5. Remove demo fallback behavior and require verified auth in production.
6. Add role/ownership checks to every API route and make the server derive identity from the verified token.
7. Return answer-safe test data to students and perform authoritative server-side grading and time-window validation.
8. Verify OAuth redirect URLs, Supabase site URL, allowed redirect URLs, and the deployed frontend origin.
9. Run smoke tests against the deployed URLs: `/`, a deep SPA route, `/api/health`, login, role selection, profile save, staff test creation, student test launch, submission, staff result view, and admin-only actions.
10. Review Supabase logs and Vercel function logs for 401/403/500 responses before opening access to real institutional users.

## Verification Performed

- Direct Vite production build: **passed**; build emitted a large-chunk warning.
- Direct Oxlint run: **failed** on the conditional Hooks violation in `frontend/src/components/staff/StaffOnboardingModal.jsx`; many warnings also remain.
- `node --check backend/server.js`: **passed** syntax validation.
- Backend module import with `VERCEL=1`: **passed** import only; this does not execute every route.
- Backend automated tests: **not available**; no test script/tests exist.
- Full live Supabase/Vercel smoke test: **not run**, because no production credentials or deployed target were supplied.

## Fixes Applied After Audit

- Backend authentication now rejects missing/invalid bearer tokens instead of creating a demo identity.
- Backend route authorization now checks database roles and authenticated ownership for profiles, groups, tests, submissions, staff requests, and admin operations.
- Test answers are removed from student API responses; submissions are graded from server-stored questions and the authenticated student identity.
- Submission timing/assignment checks and a test/student uniqueness index were added.
- Obsolete in-memory/file cleanup references were removed from the backend delete flow.
- Staff onboarding hooks were moved behind an inner component so the Rules of Hooks are satisfied.
- Fake local success paths for role selection, profile saves, test creation, and submissions were removed or reduced.
- OAuth now sends the configured hosted-domain hint, frontend API URL configuration was added, and separate frontend/backend Vercel deployment instructions were documented.
- RLS scripts were replaced with role-scoped policies instead of public allow-all policies.

These code changes still require applying the SQL policies/migrations in Supabase and configuring Vercel environment variables before production use.

## Recommended Fix Order

1. Lock down authentication, role authorization, identity derivation, CORS, and RLS before using real data.
2. Remove demo/local fallbacks and obsolete in-memory/file code; fix the undeclared-variable crash paths.
3. Fix the Hooks error and make lint clean.
4. Consolidate migrations and Vercel configuration.
5. Make test delivery answer-safe and move grading/time/eligibility enforcement to the server.
6. Add automated tests and deploy a staging environment for the end-to-end smoke checklist.

