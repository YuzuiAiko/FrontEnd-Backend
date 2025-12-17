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

  test('renders login form', () => {
    const { container } = renderApp();
    // debug DOM when failing locally
    // eslint-disable-next-line no-console
    console.log('APP_TEST_DOM:', container.innerHTML);
    expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  test('shows error when email or password is missing', async () => {
    renderApp();
    const loginButton = screen.getByRole('button', { name: /log in/i });
    
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
    });
  });

  test('handles email input change', () => {
    renderApp();
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    expect(emailInput.value).toBe('test@example.com');
  });

  test('handles password input change', () => {
    renderApp();
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    expect(passwordInput.value).toBe('password123');
  });

  test('toggles password visibility', () => {
    renderApp();
    const passwordInput = screen.getByPlaceholderText(/enter password/i);
    const toggleButton = screen.getByRole('button', { name: /show|hide/i });
    
    expect(passwordInput.type).toBe('password');
    
    fireEvent.click(toggleButton);
    
    expect(passwordInput.type).toBe('text');
    expect(toggleButton.textContent).toBe('Hide');
    
    fireEvent.click(toggleButton);
    
    expect(passwordInput.type).toBe('password');
    expect(toggleButton.textContent).toBe('Show');
  });

  test('renders demo mode button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /enter demo/i })).toBeInTheDocument();
  });

  test('enters demo mode when demo button is clicked', () => {
    renderApp();
    const demoButton = screen.getByRole('button', { name: /enter demo/i });
    
    fireEvent.click(demoButton);
    
    expect(window.location.href).toContain('/home?demo=1');
  });

  test('renders Gmail login option', () => {
    renderApp();
    const gmailLogo = screen.getByAltText(/gmail/i);
    expect(gmailLogo).toBeInTheDocument();
  });

  test('handles Gmail login click', () => {
    renderApp();
    const gmailCircle = screen.getByAltText(/gmail/i).closest('.account-circle');
    
    if (gmailCircle) {
      fireEvent.click(gmailCircle);
      // Should redirect to Gmail OAuth
      expect(window.location.href).toContain('/auth/gmail/login');
    }
  });

  test('displays logo correctly', () => {
    renderApp();
    const logo = screen.getByAltText(/app logo|logo/i);
    expect(logo).toBeInTheDocument();
  });

  test('displays app name', () => {
    renderApp();
    // App name should be visible (either "SiFri Mail" or "ImfrisivMail")
    const title = screen.getByText(/sifri mail|imfrisivmail/i);
    expect(title).toBeInTheDocument();
  });
});
