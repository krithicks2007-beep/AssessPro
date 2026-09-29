# AssessPro Bug Audit

Audit date: 2026-09-29

Scope: current `frontend/`, `backend/`, and database SQL files. This is an analysis-only report; no application source code was changed.

## Critical

### BUG-001: Backend cannot start because `server.js` contains an orphaned duplicated block

- Area: Backend
- Location: `backend/server.js:274-279`
- Evidence: after the complete `/api/student/assigned-staff` handler ends at line 272, lines 274-279 contain bare object properties and a second `});` outside any function or object.
- Impact: `node --check backend/server.js` fails with `SyntaxError: Unexpected token ':'` at line 275, so the Express server cannot start or serve any API route.
- Recommendation: remove or restore the duplicated fragment and rerun syntax validation before deployment.

### BUG-002: Staff onboarding modal conditionally executes hooks

- Area: Frontend
- Location: `frontend/src/components/staff/StaffOnboardingModal.jsx:28-57`
- Evidence: the component returns at line 29 before executing its `useState` and `useEffect` hooks at lines 34-57 when `isOpen` is false.
- Impact: opening or closing the modal changes the number/order of hooks executed by the component, violating React’s Rules of Hooks and causing runtime errors or unstable state. Oxlint reports multiple `react-hooks(rules-of-hooks)` errors for this file.
- Recommendation: call hooks on every render and conditionally return the modal markup after hook declarations.

### BUG-003: Authentication middleware fails open to a demo identity

- Area: Backend security
- Location: `backend/server.js:78-105`
- Evidence: missing credentials, mock tokens, absent Supabase configuration, invalid tokens, and token-verification exceptions all assign `demo@bitsathy.ac.in` to `req.user` and continue instead of returning `401`.
- Impact: protected endpoints can be called without a valid session and are processed as the demo account. This makes every authorization defect below exploitable and can cause actions to be attributed to the wrong user.
- Recommendation: reject missing or invalid credentials with `401`; keep demo behavior behind an explicit development-only flag that cannot be enabled in production.

### BUG-004: Admin routes authenticate but never authorize the caller as an admin

- Area: Backend security
- Locations: `backend/server.js:523-579`, `backend/server.js:1181-1305`
- Evidence: staff-request approval/rejection, user listing, role changes, user deletion, and database reset use only `verifyAuth`; there is no check of `req.user` or the stored `UserType`.
- Impact: any caller accepted by the fail-open middleware can approve or reject staff, change roles, delete users, or wipe tests/submissions.
- Recommendation: add a server-side admin authorization guard and protect every administrative action with it.

### BUG-005: Row-level security policies grant unrestricted access to every table

- Area: Backend/database security
- Locations: `backend/schema.sql:104-119`, `backend/migration_supabase_only.sql:33-40`
- Evidence: all policies use `FOR ALL USING (true) WITH CHECK (true)`.
- Impact: clients using the Supabase key can read, insert, update, or delete users, profiles, tests, submissions, groups, and staff requests without row-level ownership checks. This defeats the intended access boundary even if the Express routes are later fixed.
- Recommendation: replace the permissive policies with authenticated-user, ownership, and admin policies; review whether service-role access is needed for each operation.

## High

### BUG-006: Public endpoints expose profiles, tests, questions, and submissions

- Area: Backend security/privacy
- Locations: `backend/server.js:177`, `backend/server.js:248`, `backend/server.js:585`, `backend/server.js:661`, `backend/server.js:857`, `backend/server.js:905`, `backend/server.js:1140`, `backend/server.js:1163`
- Evidence: these routes do not use authentication middleware and accept caller-controlled email/test identifiers.
- Impact: unauthenticated callers can enumerate student/staff profile data, assessment questions, answer data, grades, tab-switch counts, and other submission details.
- Recommendation: require authentication, enforce ownership or role checks, and minimize fields returned to each role.

### BUG-007: Submission identity and grading values are client-controlled

- Area: Backend integrity
- Location: `backend/server.js:1058-1137`
- Evidence: the request supplies `studentEmail`, `score`, `percentage`-related fields, correct count, question count, and max score. Server grading only runs when `clientScore === undefined`; the email is not required to match `req.user.email`.
- Impact: a caller can submit on behalf of another student and send an inflated score or altered totals. The result is stored as completed in the database.
- Recommendation: derive identity from the verified session, load the authoritative test metadata, grade from submitted answers on the server, and ignore client score/total fields.

### BUG-008: Test creation and role selection trust caller-supplied identity fields

- Area: Backend authorization/integrity
- Locations: `backend/server.js:448-488`, `backend/server.js:933-997`
- Evidence: role choice uses `req.body.email` ahead of the verified user email; test creation accepts `created_by_email`, `userEmail`, and `userId` from the body without binding them to the authenticated user.
- Impact: a caller can create role records or tests attributed to another email/user, subject to the permissive database policies.
- Recommendation: derive ownership from the verified session and treat submitted identity fields as display data only, or reject mismatches.

### BUG-009: Any authenticated/fail-open caller can modify or delete any test

- Area: Backend authorization
- Locations: `backend/server.js:999-1056`
- Evidence: update and delete routes check only `verifyAuth`; neither verifies staff/admin role or test ownership.
- Impact: tests can be edited, republished, reassigned, or deleted by unauthorized users. Delete also removes submissions unless `keepData` is supplied.
- Recommendation: enforce staff/admin authorization and ownership for update/delete, and require an explicit privileged action for submission deletion.

### BUG-010: User deletion reports success after database/auth deletion failures

- Area: Backend reliability
- Location: `backend/server.js:1243-1285`
- Evidence: database and Supabase Auth deletion errors are caught, logged, and ignored; the route still returns `{ success: true }`.
- Impact: the UI can report a user as fully deleted while the account or profile remains in Supabase, producing orphaned or partially deleted identities.
- Recommendation: check each operation’s returned error, fail the request on required-step failure, and use a transactional/compensating deletion strategy.

### BUG-011: Backend contains references to removed in-memory/file registries

- Area: Backend runtime
- Locations: `backend/server.js:327`, `backend/server.js:383`, `backend/server.js:406`, `backend/server.js:420`, `backend/server.js:1276-1282`
- Evidence: `inMemoryStaffRequests`, `inMemoryStudentProfiles`, `studentStaffAssignments`, `inMemorySubmissions`, and save helpers are referenced, but no declarations/implementations are present in the current file.
- Impact: once the syntax error is fixed, affected profile and deletion paths will throw `ReferenceError` or fail to complete their cleanup logic.
- Recommendation: finish the Supabase-only migration by replacing these references with database operations, or restore the required definitions consistently.

### BUG-012: CORS accepts requests from every origin

- Area: Backend security/configuration
- Location: `backend/server.js:12`
- Evidence: `app.use(cors())` enables the default wildcard behavior.
- Impact: any website can make browser requests to the API. Combined with weak authentication and permissive RLS, this broadens the attack surface for data access and destructive actions.
- Recommendation: allow only configured frontend origins and handle credentials explicitly if they are required.

## Medium

### BUG-013: Local fallback can claim persistence after a failed server write

- Area: Frontend reliability
- Locations: `frontend/src/api.js:264-332`, `frontend/src/api.js:1086-1112`, `frontend/src/api.js:859-903`
- Evidence: update/delete/admin-request helpers catch backend failures, mutate localStorage, and return success-like values (`updated`, `{ success: true }`, or a local status).
- Impact: users can see changes that exist only in one browser and disappear for other users or after storage is cleared. Failed deletions may appear complete.
- Recommendation: distinguish confirmed server success from offline/local drafts and surface a failure state when the authoritative write did not complete.

### BUG-014: Locally created tests disappear when the backend returns an array

- Area: Frontend data consistency
- Locations: `frontend/src/api.js:354-360`, `frontend/src/api.js:366-418`
- Evidence: `getTests()` immediately returns any backend array, including an empty array. Local custom tests are merged only in the direct-Supabase fallback path, which runs after the backend request fails.
- Impact: tests saved through the local fallback are hidden whenever the API is reachable but does not return them.
- Recommendation: define one source-of-truth strategy and merge/synchronize local drafts explicitly when the backend response is incomplete.

### BUG-015: Staff data loading has no visible loading/error state and uses a stale effect closure

- Area: Frontend UX/state management
- Location: `frontend/src/components/staff/StaffLayout.jsx:36`, `frontend/src/components/staff/StaffLayout.jsx:72-108`
- Evidence: `loading` is initialized but never updated or rendered; `loadData()` catches errors and only logs them. The effect invokes `loadData()` with an empty dependency list even though the function reads `user` and `newTestGroupId`.
- Impact: failed requests can leave an empty staff dashboard with no explanation, and the initial request can use stale user/group values when those props or state change. Oxlint also reports the missing hook dependency.
- Recommendation: model loading/error states in the UI and make the data-loading callback/dependencies explicit.

### BUG-016: Google OAuth implementation does not send the documented hosted-domain restriction

- Area: Frontend authentication
- Location: `frontend/src/supabaseClient.js:45-60`
- Evidence: the comment says the flow uses Google’s `hd` parameter, but `queryParams` contains only `prompt` and `access_type`.
- Impact: Google’s account picker is not restricted to the institutional domain. The UI also offers external accounts an “Instant Access” student path at `frontend/src/components/auth/RoleSelectionModal.jsx:249-262`, so domain enforcement is not reliable at the client boundary.
- Recommendation: enforce allowed domains on the server and configure the OAuth provider consistently; treat client role choice as untrusted input.

### BUG-017: Global 401 handling can sign out users because public requests share the same helper

- Area: Frontend session handling
- Location: `frontend/src/api.js:22-30`
- Evidence: every 401 except `/auth/login` dispatches `session-expired`, including calls made without auth headers such as test/profile/status lookups.
- Impact: a public endpoint returning 401 for an ordinary validation or authorization reason can trigger a global logout/session-expired flow.
- Recommendation: dispatch session expiration only for authenticated requests or a dedicated auth-validation response, and handle public request failures locally.

## Verification

- `node --check backend/server.js`: failed with `SyntaxError: Unexpected token ':'` at line 275.
- Direct frontend Vite build: passed; the generated JavaScript bundle is over the default 500 kB chunk warning threshold.
- Direct frontend Oxlint: failed because of the conditional-hook errors in `StaffOnboardingModal.jsx`; additional warnings include the stale `StaffLayout` effect dependency and unused loading state.
- Backend automated test script: none is defined in `backend/package.json`; only `start` and `dev` scripts are present.

## Audit Note

This file records the current checkout only. Previously reported issues that are no longer present in the current source were omitted from this refresh.
