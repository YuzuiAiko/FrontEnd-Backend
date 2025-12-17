import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
  default: {
    post: jest.fn()
  }
}));

// Mock gapi
global.gapi = {
  load: jest.fn((api, callback) => {
    if (callback) callback();
  }),
  client: {
    init: jest.fn()
  }
};

// Mock window.location
delete window.location;
window.location = { href: '' };

const renderApp = () => render(<App />);

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });
  test('renders without crashing (smoke)', () => {
    renderApp();
    expect(true).toBe(true);
  });
});
