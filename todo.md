# Project TODO — Scholarly (Student Management System)

## Phase 1 — Database & Backend
- [ ] Students table in drizzle/schema.ts (name, studentId, email, phone, dateOfBirth, grade, enrollmentDate, status, notes)
- [ ] Academic records table (grades/marks, subject, date)
- [ ] Activity log table (action, detail, timestamp) for timeline
- [ ] Generate migration and apply via webdev_execute_sql
- [ ] DB helper functions in server/db.ts (CRUD, list with search/filter/sort/pagination, stats)
- [ ] tRPC student router: list, get, create, update, delete (with zod validation)
- [ ] tRPC academic records router: list/create/delete
- [ ] tRPC dashboard stats procedure (totals, trends, grade distribution)
- [ ] tRPC activity timeline procedure
- [ ] Vitest tests for validation and CRUD procedures

## Phase 2 — Design System & Layout
- [ ] Scandinavian palette in index.css (pale cool gray bg, bold black headings, thin subtitles, pastel blue/blush pink accents)
- [ ] Google fonts (e.g., Fraunces or similar display + Inter light) in client/index.html
- [ ] Sidebar layout with exactly: Dashboard, Students, Settings nav sections
- [ ] Responsive mobile behavior (collapsible sidebar / sheet on mobile)
- [ ] Shared UI: stat cards, empty states, loading skeletons, page transitions

## Phase 3 — Dashboard & Directory
- [ ] Dashboard page: total students, active/inactive counts, enrollment trend, grade distribution, attendance overview
- [ ] Students directory: paginated table, search by name/student ID, filter by grade and status, sortable columns
- [ ] Loading and empty states for every data view

## Phase 4 — Student Forms & Detail
- [ ] Add student form with exactly: name, student ID, email, phone, date of birth, grade/class, enrollment date, status
- [ ] Client + server validation
- [ ] Edit student with pre-filled form and inline validation
- [ ] Delete with confirmation dialog
- [ ] Student detail page: full profile, academic records, activity timeline, back navigation

## Phase 5 — Settings, State & Polish
- [ ] Settings page (profile/preferences, e.g., school name, theme-ish prefs; functional)
- [ ] Search/filter state preserved across navigation (URL query params)
- [ ] Smooth premium animations (counters, staggered list entrances, modal transitions, hover states)
- [ ] Full mobile responsiveness verified (dashboard, list, detail, forms, dialogs)

## Phase 6 — QA
- [ ] pnpm test passes
- [ ] pnpm check (TypeScript) passes
- [ ] Lint passes
- [ ] Verify CRUD end-to-end in preview
- [ ] Verify responsive design

## Phase 7 — Delivery
- [ ] Save checkpoint and deliver summary
