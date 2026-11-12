# AI Development Prompt Log â€” BalanceVault

**Project:** BalanceVault
**AI tools used:** ChatGPT and GitHub Copilot Agent

> **Note:** The entries below are reconstructed summaries of development requests and AI-assisted work. They are not claimed to be exact verbatim copies of the original prompts. They document the actual development tasks, issues encountered, corrections and related commits.

## Entry 1 â€” 11 November 2026: Database and Prisma Setup

**What I asked:**
A summary of the request was to configure PostgreSQL with Prisma for the BalanceVault backend and establish the initial database schema.

**What the AI produced:**
AI assistance helped configure Prisma, database connectivity and the initial schema.

**What went wrong or needed attention:**
Database connectivity and configuration required debugging, including local PostgreSQL connection settings.

**What I did to address it:**
I checked the database configuration, corrected the connection settings and verified that the backend could communicate with PostgreSQL.

**Related commit:**
[224e061 â€” Configure Prisma and PostgreSQL](https://github.com/sivapothula000/BalanceVault/commit/224e061)

---

## Entry 2 â€” 11 November 2026: Authentication

**What I asked:**
A summary of the request was to implement user registration and login using password hashing and JWT authentication.

**What the AI produced:**
AI assistance helped implement authentication using bcrypt and JWT, along with input validation.

**What went wrong or needed attention:**
Authentication required testing for invalid credentials, invalid inputs and missing configuration.

**What I did to address it:**
I reviewed the authentication flow and ran the backend tests to verify registration, login and error cases.

**Related commit:**
[0974603 â€” Implement JWT authentication and registration tests](https://github.com/sivapothula000/BalanceVault/commit/0974603)

---

## Entry 3 â€” 12 November 2026: Authorization and Role-Based Access Control

**What I asked:**
A summary of the request was to protect backend routes using JWT authentication and role-based authorization so customers could not access admin-only operations.

**What the AI produced:**
AI assistance helped implement authentication middleware and role-based route protection.

**What went wrong or needed attention:**
Authentication alone was not sufficient. The backend also needed to check user roles before allowing access to protected operations.

**What I did to address it:**
I reviewed the protected routes and tested missing, invalid and expired tokens, as well as customer and admin access restrictions.

**Related commit:**
[17b4379 â€” Add JWT authorization and role-based access control](https://github.com/sivapothula000/BalanceVault/commit/17b4379)

---

## Entry 4 â€” 12 November 2026: Account Ownership, Transfers and Ledger

**What I asked:**
A summary of the request was to implement account operations, validate money transfers, prevent unauthorized access to another customer's account and record transfer entries.

**What the AI produced:**
AI assistance helped implement account and transfer logic, transactional debit and credit operations, and ledger entries.

**What went wrong or needed attention:**
Transfer logic needed checks for account ownership, active accounts, insufficient funds and transfers between the same account.

**What I did to address it:**
I reviewed the validation logic and ran finance tests covering ownership, insufficient funds and transfer-related cases.

**Related commit:**
[c317c8a â€” Implement accounts, transfers and double-entry ledger](https://github.com/sivapothula000/BalanceVault/commit/c317c8a)

---

## Entry 5 â€” 12 November 2026: Production Debugging and Financial Amount Handling

**What I asked:**
A summary of the request was to investigate production and dashboard issues involving API integration and financial amount formatting.

**What the AI produced:**
AI assistance helped identify and correct API configuration and financial amount handling issues.

**What went wrong or needed attention:**
Production configuration and differences in financial amount representations caused issues that needed debugging.

**What I did to address it:**
I corrected the relevant configuration and amount-handling logic, then ran the frontend tests and production build.

**Related commit:**
[96fae3f â€” Normalize financial amounts and dashboard totals](https://github.com/sivapothula000/BalanceVault/commit/96fae3f)

---

## Reflection

AI tools helped with implementation, debugging, code suggestions and test development. I reviewed the generated changes, ran tests and addressed issues during development. AI-generated code was not treated as automatically correct; the implementation still required review and verification.
