import type { Category } from '@mazal/contracts';
import { useCallback, useSyncExternalStore } from 'react';

import type { IconName } from '@/components/ui/Icon';
import { categoryIcon } from '@/lib/categoryIcon';

import { qk } from './hooks';
import { queryClient } from './queryClient';

const subscribe = (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange);

/**
 * Category icon for an id, read from the categories already in the query cache (loaded once
 * at startup by the root layout). Never triggers a fetch; falls back to a generic icon.
 */
export function useCategoryIcon(categoryId: string | null | undefined): IconName {
  const getSnapshot = useCallback(() => queryClient.getQueryData<Category[]>(qk.categories), []);
  const categories = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return categoryIcon(categories?.find((c) => c.id === categoryId));
}
