import type { SavedSearch } from './types';

export const MOCK_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: 'ss_001',
    userId: 'user_free_001',
    query: 'Dyson V15',
    normalizedQuery: 'dyson v15',
    filters: { condition: 'Like New' },
    createdAt: '2025-01-10T09:00:00Z',
    alertsEnabled: true,
  },
  {
    id: 'ss_002',
    userId: 'user_free_001',
    query: 'Herman Miller Aeron size B',
    normalizedQuery: 'herman miller aeron size b',
    filters: { maxPrice: 900 },
    createdAt: '2025-01-18T14:30:00Z',
    alertsEnabled: false,
  },
  {
    id: 'ss_003',
    userId: 'user_free_001',
    query: 'Nike Vomero 5',
    normalizedQuery: 'nike vomero 5',
    filters: {},
    createdAt: '2025-02-02T11:00:00Z',
    alertsEnabled: true,
  },
];
