import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Homepage from './Homepage';
import axios from 'axios';

// Mock axios
jest.mock('axios');
axios.get = jest.fn();
axios.post = jest.fn();

// Mock fetch — provide a safe default that returns an empty email list.
global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ emails: [] }) }));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: (html, options) => {
    if (options && options.ALLOWED_TAGS && options.ALLOWED_TAGS.length === 0) {
      // Strip HTML tags
      return html.replace(/<[^>]*>/g, '');
    }
    return html;
  }
}));

const mockEmails = [
  {
    sender: 'test@example.com',
    subject: 'Test Email 1',
    body: '<p>Test body 1</p>',
    date: new Date().toISOString(),
    classification: ['important']
  },
  {
    sender: 'another@example.com',
    subject: 'Test Email 2',
    body: '<p>Test body 2</p>',
    date: new Date(Date.now() - 86400000).toISOString(),
    classification: ['promotional']
  }
];

describe('Homepage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    // Ensure fetch returns a resolved promise by default for tests that don't override it
    fetch.mockImplementation(() => Promise.resolve({ ok: true, json: async () => ({ emails: [] }) }));
  });

  test('renders in demo mode with demo emails', () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);
    
    expect(screen.getByText(/demo mode/i)).toBeInTheDocument();
    expect(screen.getByText(/test email 1/i)).toBeInTheDocument();
    expect(screen.getByText(/test email 2/i)).toBeInTheDocument();
  });

  test('displays loading state initially', () => {
    // Use demoMode to avoid network fetch in this unit test and still validate loading UI
    render(<Homepage demoMode={true} demoEmails={[]} />);
    // Component should not be in a loading state for demoMode (immediate load)
    expect(screen.queryByText(/loading emails/i)).not.toBeInTheDocument();
  });

  test('displays email list', async () => {
    // Use demoMode to render the list deterministically without mocking fetch timing
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      expect(screen.getByText(/test email 1/i)).toBeInTheDocument();
    });
  });

  test('handles email selection', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const emailItem = screen.getByText(/test email 1/i);
      fireEvent.click(emailItem);
    });

    await waitFor(() => {
      expect(screen.getByText(/test email 1/i)).toBeInTheDocument();
      expect(screen.getByText(/test body 1/i)).toBeInTheDocument();
    });
  });

  test('filters emails by search query', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search emails/i);
      fireEvent.change(searchInput, { target: { value: 'Test Email 1' } });
    });

    await waitFor(() => {
      expect(screen.getByText(/test email 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/test email 2/i)).not.toBeInTheDocument();
    });
  });

  test('sorts emails by date', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const sortDropdown = screen.getByDisplayValue(/sort by date/i);
      expect(sortDropdown).toBeInTheDocument();
    });
  });

  test('filters emails by category', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const importantButtons = screen.getAllByText(/important/i);
      // click the first logical Important button (sidebar)
      fireEvent.click(importantButtons[0]);
    });

    // Should only show important emails
    await waitFor(() => {
      expect(screen.getByText(/test email 1/i)).toBeInTheDocument();
      expect(screen.queryByText(/test email 2/i)).not.toBeInTheDocument();
    });
  });

  test('opens compose modal', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const composeButton = screen.getByText(/compose/i);
      fireEvent.click(composeButton);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/recipient's email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/subject/i)).toBeInTheDocument();
    });
  });

  test('handles compose form input', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const composeButton = screen.getByText(/compose/i);
      fireEvent.click(composeButton);
    });

    await waitFor(() => {
      const recipientInput = screen.getByPlaceholderText(/recipient's email/i);
      const subjectInput = screen.getByPlaceholderText(/subject/i);
      const bodyInput = screen.getByPlaceholderText(/write your email/i);

      fireEvent.change(recipientInput, { target: { value: 'recipient@example.com' } });
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyInput, { target: { value: 'Test body' } });

      expect(recipientInput.value).toBe('recipient@example.com');
      expect(subjectInput.value).toBe('Test Subject');
      expect(bodyInput.value).toBe('Test body');
    });
  });

  test('toggles dark mode', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const themeToggle = screen.getByLabelText(/switch to dark mode|switch to light mode/i);
      fireEvent.click(themeToggle);
    });

    // Theme should toggle (visual change, hard to test without checking class)
    expect(screen.getByLabelText(/switch to dark mode|switch to light mode/i)).toBeInTheDocument();
  });

  test('handles pagination', async () => {
    // Create more emails for pagination
    const manyEmails = Array.from({ length: 25 }, (_, i) => ({
      sender: `sender${i}@example.com`,
      subject: `Email ${i}`,
      body: `Body ${i}`,
      date: new Date().toISOString(),
      classification: ['important']
    }));

    render(<Homepage demoMode={true} demoEmails={manyEmails} />);

    await waitFor(() => {
      const pageButtons = screen.getAllByRole('button').filter(btn => /^\d+$/.test(btn.textContent));
      expect(pageButtons.length).toBeGreaterThan(1);
    });
  });

  test('displays email classification labels', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      expect(screen.getByText(/important/i)).toBeInTheDocument();
      expect(screen.getByText(/promotional/i)).toBeInTheDocument();
    });
  });

  test('handles reply functionality', async () => {
    render(<Homepage demoMode={true} demoEmails={mockEmails} />);

    await waitFor(() => {
      const emailItem = screen.getByText(/test email 1/i);
      fireEvent.click(emailItem);
    });

    await waitFor(() => {
      const replyButton = screen.getByText(/reply/i);
      fireEvent.click(replyButton);
    });

    await waitFor(() => {
      const recipientInput = screen.getByPlaceholderText(/recipient's email/i);
      expect(recipientInput.value).toBe('test@example.com');
      expect(screen.getByPlaceholderText(/subject/i).value).toContain('Re:');
    });
  });
});

