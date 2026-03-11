import type { User } from './types';

export const MOCK_FREE_USER: User = {
  id: 'user_free_001',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  plan: 'free',
  createdAt: '2024-11-15T10:00:00Z',
};

export const MOCK_PRO_USER: User = {
  id: 'user_pro_001',
  name: 'Jordan Kim',
  email: 'jordan@example.com',
  plan: 'pro',
  createdAt: '2024-09-01T08:30:00Z',
};
