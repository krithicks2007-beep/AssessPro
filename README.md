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

## 🌍 Deployment Strategy (Vercel + Render + Supabase)

This application uses a fully decoupled architecture optimized for production:

1. **Database (Supabase):**
   - Create a new project in Supabase.
   - Run the SQL files from the `backend/` directory in the SQL Editor in this exact order:
     1. `01_schema_init.sql`
     2. `02_migrations.sql`
     3. `03_rls_policies.sql`
   - Configure Authentication: Enable Google OAuth and set your callback URLs.

2. **Backend (Render):**
   - Deploy the `backend` directory as a Web Service on Render (Node.js environment).
   - Set the Build Command: `npm install`
   - Set the Start Command: `npm start`
   - Set Environment Variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `ALLOWED_ORIGINS` (Set to your future Vercel frontend URL)

3. **Frontend (Vercel):**
   - Deploy the `frontend` directory as a Vite/React project on Vercel.
   - Set Environment Variables:
     - `VITE_API_URL` (Set to your Render backend URL, e.g., `https://your-app.onrender.com/api`)
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - Note: Update your Supabase allowed redirect URIs to include the generated Vercel domain.
