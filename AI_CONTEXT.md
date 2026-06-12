# AI Context

**Version**: 1.4
**Project**: Splitwise Clone (Internship Assignment)
**Current Phase**: React Frontend Designed

## Context Overview
The user is a junior engineer working on a Splitwise clone. We have completed product reverse engineering, defined the MVP scope, designed a normalized PostgreSQL database schema, defined REST API specifications, and designed the React frontend architecture. No source code has been written yet.

## Product Logic & Scope
- **Core Philosophy**: A ledger system translating shared real-world actions into digital debt relationships.
- **MVP Scope Details**:
  - **Authentication**: Email/Password Register and Login.
  - **Groups**: Create Group, Add Member, Remove Member (only when balance is exactly zero).
  - **Expenses**: Support for Equal, Unequal, Percentage, and Share/Ratio splits.
  - **Balances**: Group balance summary (conservation of debt) and Individual/Dashboard aggregated balance summary.
  - **Settlement**: Record manual settlements (Cash, external P2P) to decrement outstanding debts.
  - **Chat**: Real-time comment/discussion threads on individual expenses.

## Database Architecture (PostgreSQL)
- **Primary Keys**: UUIDs (`uuid-ossp` extension) for all tables.
- **Currency Data Type**: `NUMERIC(12, 2)` to eliminate floating-point precision errors.
- **Key Tables**: `users`, `groups`, `group_members`, `expenses`, `expense_splits`, `settlements`, `expense_comments`.

## API Architecture (RESTful)
- **Authentication**: JWT authentication token (`Authorization: Bearer <token>`).
- **Endpoints**:
  - **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
  - **Groups**: `POST /api/groups`, `GET /api/groups`, `GET /api/groups/:id`, `POST /api/groups/:id/members`, `DELETE /api/groups/:id/members/:userId`
  - **Expenses**: `POST /api/expenses`, `GET /api/expenses`, `DELETE /api/expenses/:id`
  - **Settlements**: `POST /api/settlements`, `GET /api/settlements`
  - **Chat**: `POST /api/expenses/:id/comments`, `GET /api/expenses/:id/comments`

## React Frontend Architecture
- **Routing**: React Router paths for `/login`, `/register`, `/dashboard`, `/groups/:groupId`, `/groups/:groupId/expenses/new`, `/groups/:groupId/settle`.
- **State Management**: `AuthContext` (JWT session), React Query (Server caching), local states for UI (drawer, modals) and complex split forms.
- **Dynamic Split Form**: Handles active tab changes (Equal/Unequal/Percentage/Share) by dynamically updating input fields and client-side penny validation.
- **Real-time Chat**: WebSocket (Socket.io-client) connection in the Expense Details Drawer.

## Key Decisions
- **Out of Scope (Advanced)**: Graph-based debt simplification, OCR/receipt scanning, recurring expenses, and third-party payment API integrations are excluded for this stage.
