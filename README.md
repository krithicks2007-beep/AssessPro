# AssessPro - Continuous Assessment & Intelligence Portal

Educational assessment and performance tracking web application with email-based authentication.

---

## 🏛️ Professional Decoupled Architecture

The project is structured with a **clean separation of concerns**:
- **Frontend (Client UI)**: React 19 + Vite. Responsible for rendering the modern interface, managing local client state, and communicating exclusively with the backend via `/api/...` REST endpoints.
- **Backend (API Service)**: Node.js + Express. Responsible for request routing, authentication checks, business logic, and database operations.

```
AssessPro/
├── package.json              # Monorepo root script runner (concurrently)
│
├── frontend/                 # Client UI (Vite + React)
│   ├── src/
│   │   ├── api.js           # Centralized API service talking to backend
│   │   ├── components/
│   │   │   ├── LoginPage.jsx        # Google OAuth & Email login
│   │   │   ├── StudentDashboard.jsx # Student group analytics & progress
│   │   │   ├── StaffDashboard.jsx   # Group management, question uploads, tests
│   │   │   ├── AdminDashboard.jsx   # Role assignments and domain oversight
│   │   │   └── ConfigModal.jsx      # Settings modal
│   │   ├── supabaseClient.js        # Supabase OAuth client
│   │   ├── App.jsx                  # Main router and domain security filter
│   │   └── index.css                # Custom styling
│   ├── vite.config.js       # Proxies /api requests to http://localhost:5000
│   └── package.json
│
└── backend/                  # REST API Server (Node.js + Express)
    ├── server.js             # REST endpoints (auth, groups, tests, users, domain filter)
    ├── schema.sql            # Supabase PostgreSQL database schema & RLS policies
    ├── .env                  # Port, Supabase credentials, Allowed Domain
    └── package.json
```

---

## 🚀 How to Run the Project

### Option A: Run Both Together (Recommended)
From the root folder `d:\AssessPro`:
```powershell
npm run dev
```
*This starts both the Backend API (`port 5000`) and Frontend Client (`port 3000`) simultaneously with unified colorful logs.*

---

### Option B: Run in Separate Terminals

#### Terminal 1 (Backend API):
```powershell
cd d:\AssessPro\backend
npm run dev
```
> Running on `http://localhost:5000`

#### Terminal 2 (Frontend Client):
```powershell
cd d:\AssessPro\frontend
npm run dev
```
> Running on `http://localhost:3000` (or `http://localhost:5173`)

---

## 🔌 Backend REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend and database status |
| `POST` | `/api/auth/login` | Institutional email login & domain verification |
| `GET` | `/api/user/profile` | Authenticated profile and verified institutional role |
| `GET` | `/api/groups` | Fetch all assessment groups (auto-seeded) |
| `POST` | `/api/groups` | Create new academic group (max 6 groups rule) |
| `PUT` | `/api/groups/:id` | Rename / update group |
| `DELETE` | `/api/groups/:id` | Remove group and related tests |
| `GET` | `/api/tests` | List all tests with group association |
| `POST` | `/api/tests` | Create & deploy new assessment or task |
| `GET` | `/api/admin/users` | List institutional users for Admin Console |
| `PUT` | `/api/admin/users/:id/role` | Update user role (`student`, `staff`, `admin`) |

## Vercel Deployment

Deploy this repository as two Vercel projects:

1. Create a backend project with root directory `backend`. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `ALLOWED_DOMAIN` for default role classification, and `ALLOWED_ORIGINS` (the deployed frontend URL plus local development URLs). Use `backend/vercel.json` and verify `/api/health` on the deployed backend URL.
2. Create a frontend project with root directory `frontend`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_ALLOWED_DOMAIN` for default role classification, and `VITE_API_URL` to the backend deployment URL. Use `frontend/vercel.json`.
3. Apply `backend/schema.sql`, the required additive migrations, and `backend/fix_rls.sql` in Supabase. Never use the old allow-all policies.
4. Configure the Supabase site URL, Google OAuth callback, and allowed redirect URLs with the deployed frontend URL.

The root `vercel.json` remains for a combined deployment option, but the two-project setup is easier to operate and makes the frontend/backend environment boundaries explicit.
