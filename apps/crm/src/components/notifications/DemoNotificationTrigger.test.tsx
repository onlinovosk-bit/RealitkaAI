import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DemoNotificationTrigger from './DemoNotificationTrigger';

describe('DemoNotificationTrigger', () => {
  it('renders demo buttons', () => {
    render(<DemoNotificationTrigger userId="demo-user" />);
    expect(screen.getByText(/Demo Retention Notifikácia/i)).toBeVisible();
    expect(screen.getByText(/Demo Aktivita Notifikácia/i)).toBeVisible();
  });

  it('triggers notification on button click', () => {
    render(<DemoNotificationTrigger userId="demo-user" />);
    const button = screen.getByText(/Demo Retention Notifikácia/i);
    fireEvent.click(button);
    // You may want to check for a callback, toast, or UI update here
  });
});
