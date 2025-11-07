import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Homepage from '../components/Homepage';
import demoData from '../demo-data/sample-emails.json';

test('renders demo inbox with at least one email', async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <Homepage demoMode={true} demoEmails={demoData.emails} userEmail="test@example.com" />
      </MemoryRouter>
    );
  });
  const firstSubject = await screen.findByText(demoData.emails[0].subject);
  expect(firstSubject).toBeInTheDocument();
});
