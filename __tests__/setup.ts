import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.RESEND_API_KEY = 'test-resend-api-key';
process.env.RESEND_FROM_EMAIL = 'test-resend-from@example.com';

// Mock fetch globally
global.fetch = vi.fn(() => Promise.resolve({}));

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
