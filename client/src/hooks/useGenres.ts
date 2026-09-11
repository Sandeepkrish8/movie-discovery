import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api';
import type { Genre } from '../types';

/**
 * Genres effectively never change, so this is cached for the whole session.
 * The server caches it for 7 days on top of that.
 */
export function useGenres() {
  return useQuery({
    queryKey: ['genres'],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<{ items: Genre[] }>('/genres', { signal });
      return data.items;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
