// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Provide a lightweight mock for react-router-dom for the test environment
// so tests that import `BrowserRouter` do not fail due to ESM resolution issues.
try {
	// jest is available in the test environment
	jest.mock('react-router-dom', () => ({
		BrowserRouter: ({ children }) => children,
		Link: ({ children }) => children,
		Routes: ({ children }) => children,
		Route: ({ children }) => children,
	}));
} catch (e) {
	// noop if jest isn't defined in non-test contexts
}
