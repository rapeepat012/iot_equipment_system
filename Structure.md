# Project Structure

## Overview
This project is a full-stack IoT equipment borrowing system:
- `src/` = Frontend (React + Vite + Tailwind)
- `api/` = Backend API (PHP)
- `iot_equipment_system.sql` = Database schema + sample data

## Root Folders
- `api/` PHP endpoints (`login.php`, `users.php`, `equipment.php`, `borrow_requests.php`, `return_equipment.php`, etc.)
- `src/` frontend screens/components/contexts/services
- `public/` static assets (logos/images)
- `storage/` backend runtime storage (rate-limit files)

## Frontend Structure (`src/`)
- `App.tsx` route map and route guards
- `contexts/` auth/loading state
- `services/api.ts` API client + type definitions
- `components/`
  - `Layout/` main layout, sidebar, navbar, footer nav
  - `auth/` route guards
  - `equipment/`, `borrow-requests/`, `users/`, `ui/`
- `screens/` feature pages
  - auth: `Login`, `Register`
  - operations: `BorrowEquipment`, `BorrowRequests`, `ReturnEquipment`, `History`, `MyRequests`
  - admin/staff: `Dashboard`, `Equipment`, `ManageUsers`, `PendingRegistrations`

## Backend Structure (`api/`)
- `login.php` login/auth check
- `users.php` user CRUD
- `equipment.php` equipment CRUD
- `borrow_requests.php` request create + approve/reject
- `return_equipment.php` return flow
- `borrowing_history.php` history query
- `equipment_stats.php` top borrowed/damaged stats
- `pending_registrations.php` pre-approval registrations
- shared helpers: `Connect.php` (`Database`, `Response`, `Input`, `Security`, `Session`)

## Deploy Notes
- Frontend deploy target: Vercel (`vercel.json` rewrite to `index.html`)
- Backend deploy target: separate PHP host (not Vercel in this setup)

### Backend blocked from Vercel
`.vercelignore` is at project root:
- `.vercelignore`

It excludes backend-related files/folders such as:
- `api/`
- `*.php`
- `*.sql`
- `Connect.php`
- `storage/`
