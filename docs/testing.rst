Testing
=======

This project contains unit and integration tests for both the backend and the frontend. The tests included in the repository are:

- Backend tests: `backend/tests/compose.test.js`, `backend/tests/llmkeys.test.js`, `backend/tests/full_suite.test.js` — these exercise the compose routes, LLM key checking, and some integration-style checks.
- Frontend tests: `frontend/src/App.test.js` — a basic React component smoke test using Testing Library.

How to run tests
----------------

- Backend (Node):

  - From the `backend` directory run:

    ``npm test``

    The backend `test` script runs Node's test runner against a subset of tests (see `backend/package.json`).

- Frontend (React):

  - From the `frontend` directory run:

    ``npm test``

Notes on what tests cover
------------------------

- `compose.test.js` and `full_suite.test.js` include mocks for external HTTP requests (Perplexity, Gemini, OpenAI) and assert retry/fallback behavior when providers fail.
- `llmkeys.test.js` tests the `lib/llmCheck.js` helper to verify logging behavior for missing/invalid keys.
- The frontend test is a smoke test for the main `App` component.

Extending tests
---------------

To add more tests, follow the existing patterns: mock external HTTP requests (for unit tests) and use Node's test runner for backend tests or Jest/Testing Library for frontend tests.
