import { vi } from 'vitest';

// Mock Session
export const mockSession = {
  customerId: 'test-customer-id',
  email: 'test@example.com',
  isAdmin: false,
};

export const mockAdminSession = {
  customerId: 'admin-customer-id',
  email: 'admin@example.com',
  isAdmin: true,
};

// Mock verifySession function
export const createMockVerifySession = (session = mockSession) => {
  return vi.fn().mockResolvedValue(session);
};

// Mock unauthorized session
export const mockUnauthorizedSession = vi.fn().mockResolvedValue(null);
