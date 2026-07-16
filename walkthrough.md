# Walkthrough: Admin Web Frontend & Core Infrastructure

I have completed the implementation of the curriculum database schemas, role authorization, and the first-time login security flow across the backend and the `admin-web` dashboard.

---

## 1. Curriculum Database Schemas (Programs / Parts / Sessions)

The simplified `Course` model has been upgraded to a three-level structural schema in PostgreSQL under the `learning` namespace:
- **`Program`**: Top-level learning track (e.g., "Advanced Distributed Systems") with title, description, difficulty level, and display settings.
- **`Part`**: Structured milestones or curriculum chapters mapping to a sequence (order) within a Program.
- **`Session`**: Individual learning sessions (duration, sequence) contained within each Part.

*Pushed successfully via Prisma, clients rebuilt.*

---

## 2. Admin IAM & Cryptographic Internal Trust Middleware

- **Gateway Access Boundaries**: The gateway's `authenticate` middleware intercepts incoming client JWTs, verifies them, and enforces FTL checks.
- **Internal Security Boundaries**: Downstream services (like `learning-service`) use the `@futurespark/authentication` HMAC verification utility to guarantee requests originate from the gateway.
- **Role Verification**: Created role authorization middlewares (`requireRoles`) to restrict API mutations (`POST`, `PUT`, `DELETE`) exclusively to `ADMIN` and `INSTRUCTOR` roles.

---

## 3. First-Time Login (FTL) Security Flow

Implemented a complete, secure FTL setup flow:
1. **User Table Update**: Added `requiresFtlReset` flag to user profiles. Users created by administrators are set to `requiresFtlReset: true` by default.
2. **Access Token Restrictions**: When logging in, if FTL is required, the access token payload includes `requiresFtlReset: true`.
3. **Gateway Protection**: The Gateway blocks access to all protected resource APIs (returning a `403`) for tokens flagged with `requiresFtlReset: true`.
4. **FTL Setup Page (`/ftl`)**: A high-end security compliance form prompting users to change their temporary password and complete their profile details.
5. **Flow Completion API**: On calling `/api/auth/complete-ftl` with valid current/new passwords, the backend rotates user credentials, updates their profile names, clears the FTL flag, and returns a fresh, unrestricted access token.
6. **Frontend Routing Guard**: `AdminLayout` blocks access and redirects users to `/ftl` dynamically on the client if their profile flags FTL compliance is incomplete.

---

## 4. Curriculum CMS (Slides, Guides, Worksheets) & Program Splitting

Implemented Curriculum CMS features to split programs and sequence mapped assets:
1. **Asset Metadata**: Added `slidesUrl`, `guideUrl`, and `worksheetUrl` fields to the `Session` model schema inside the `learning-service` PostgreSQL database.
2. **Curriculum Seeding**: Populated default curriculum templates for all 4 programs (Consensus Protocol milestones, Raft leader elections, qubits superposition, linear classifiers).
3. **Dynamic Catalog UI (`/courses`)**: Replaced the static courses array in `admin-web` with a dynamic client fetching pipeline. It displays live programs, module counts, and total sessions dynamically loaded from the API Gateway.
4. **Interactive Curriculum Dashboard (`/courses/[id]`)**:
   - **Visual Timeline**: Renders parts and their associated sessions vertically.
   - **Program Splitting**: Dynamic modal dialogs to split courses by adding Parts (Modules) dynamically with sequence ordering.
   - **Session Mapping**: Dialog forms to map new sessions (with custom duration and order values) into modules.
   - **Asset Management**: Form modals to add, update, and manage links for Slides, Guides, and Worksheets directly on each session.

---

## 5. Centralized Sessions Cockpit & Independent Sessions

Implemented a central management panel for sessions where program assignment is optional:
1. **Optional Program Assignment**: Modified the database schema to make `partId` optional (`partId String?` and `part Part?`) on the `Session` model, allowing sessions to exist independently of a program/module.
2. **New Directory APIs**:
   - `GET /courses/sessions`: Queries all sessions directly from the database and returns them with their optional part/program hierarchies.
   - `POST /courses/sessions`: Creates an independent, unassigned session.
3. **Central Cockpit UI (`/sessions`)**: 
   - Displays a complete directory of all sessions (both mapped and unassigned).
   - Allows users to deploy new sessions. The **Select Program** field is optional; leaving it empty creates an independent, unassigned session.
