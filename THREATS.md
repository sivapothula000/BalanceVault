# BalanceVault â€” Threat Model and Security Assessment

## 1. Introduction

BalanceVault is a money-management application built using React, Node.js, Express, Prisma and PostgreSQL.

This document identifies security threats relevant to the application, describes the implemented protections, and records remaining risks and test coverage.

The status below reflects the current implementation and available tests. A passing mocked test does not prove security against a live production database.

## 2. Threat Assessment

| No. | Threat | Implemented Protection | Test Coverage | Status |
|---|---|---|---|---|
| 1 | Unauthorized access to protected APIs | JWT authentication middleware verifies tokens. | Authentication tests cover missing, invalid and expired tokens. | Implemented |
| 2 | Customer accessing admin operations | Server-side role-based authorization protects admin routes. | Authorization tests check customer denial and admin access. | Implemented |
| 3 | One customer accessing another customer's account | Account and transfer operations check ownership using the authenticated user. | Finance tests cover account ownership and cross-customer transfer denial. | Implemented |
| 4 | Weak password storage | Passwords are hashed using bcrypt before storage. | Authentication tests cover registration and login behavior. | Implemented |
| 5 | Transfer exceeding available balance | Transfer validation checks account status and sufficient balance. | Finance tests cover insufficient funds. | Implemented |
| 6 | Duplicate transfer caused by retries | No idempotency key or duplicate-request protection is implemented. | No dedicated idempotency tests. | Not implemented |
| 7 | Brute-force login attempts | Generic invalid-credential responses are used, but request rate limiting is absent. | No rate-limiting tests. | Not implemented |
| 8 | Stolen or compromised JWT | JWT expiry is configured, but tokens are stored in browser sessionStorage and are not revoked server-side. | Authentication tests cover token validation and expiry. | Partially addressed |
| 9 | Ledger modification or tampering | Transfer operations create paired ledger entries within a database transaction. | Finance tests check ledger entries, but do not verify immutability. | Partially addressed |
| 10 | Database transaction or concurrent transfer failure | Prisma transactions and conditional balance updates are used. | Finance tests use mocked/in-memory Prisma behavior; live PostgreSQL concurrency is not verified. | Partially addressed |

## 3. Important Security Details

### Authentication
- Passwords are hashed using bcrypt.
- JWT tokens are used to authenticate protected requests.
- Invalid credentials return a generic authentication error.
- Tokens are not revoked server-side after logout.

### Authorization
- Protected routes use server-side authentication and role checks.
- Customer and admin operations have different access permissions.
- Customer account and ledger operations are scoped to account ownership.

### Financial Transactions
- Transfers validate the amount and account conditions.
- The source account must have sufficient funds.
- Debit, credit and ledger operations are performed through a Prisma transaction.
- The application does not currently provide a deposit or funding workflow.

### Ledger and Auditability
- Transfer operations create debit and credit ledger entries.
- Ledger records contain transaction-related information and timestamps.
- There is no immutable audit mechanism, reconciliation process or complete actor/action audit log.
- Therefore, the ledger should not be considered a tamper-proof or compliance-grade audit system.

## 4. Remaining Risks and Improvements

The following improvements are not currently implemented:

1. **Rate limiting:** Add request throttling for login, registration and transfer endpoints.
2. **Transfer idempotency:** Add idempotency keys to prevent duplicate transfers after retries.
3. **Token revocation:** Implement server-side session or token revocation.
4. **Safer token storage:** Consider secure HttpOnly cookie-based session handling and appropriate CSRF protections.
5. **Ledger integrity:** Add stronger database-level constraints, immutable audit records and reconciliation checks.
6. **Integration testing:** Test financial transactions and concurrent transfers against a real PostgreSQL database.
7. **Deposit workflow:** Implement a controlled funding process so customers can fund accounts before making transfers.

## 5. Test Evidence

The development test run reported:

- Backend tests: 30/30 passed.
- Frontend money-related tests: 4/4 passed.
- Frontend production build: passed.

**Testing limitation:** Backend finance tests use mocked or in-memory Prisma behavior. They do not establish that concurrent financial transactions behave correctly against a live PostgreSQL database. The results also do not prove that every production security threat has been eliminated.

## 6. Conclusion

BalanceVault implements basic authentication, server-side role-based authorization, customer ownership checks, transfer validation and transactional ledger creation.

However, the application still has security and functionality gaps, including missing rate limiting, transfer idempotency, server-side token revocation, immutable audit mechanisms and a deposit workflow.

These limitations are documented honestly and should be considered before treating the application as a production-ready financial system.
