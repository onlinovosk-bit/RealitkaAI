import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NotificationList from './NotificationList';
import * as notificationStore from '../../lib/notification-store';

describe('NotificationList', () => {
  const userId = 'demo-user';
  const notifications = [
    { id: '1', userId, type: 'info', title: 'Test 1', message: 'Test notification 1', read: false, createdAt: new Date().toISOString() },
    { id: '2', userId, type: 'info', title: 'Test 2', message: 'Test notification 2', read: true, createdAt: new Date().toISOString() },
  ];




// Moved to test-isolation to prevent Playwright from loading this file
});
