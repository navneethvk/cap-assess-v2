/**
 * @deprecated This hook is deprecated. Use useUserVisits from '@/hooks/useVisitQueries' instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 * Please migrate to the new centralized query system.
 */

import { useUserVisits as useNewUserVisits } from './useVisitQueries';

/**
 * @deprecated Use useUserVisits from '@/hooks/useVisitQueries' instead
 */
export const useUserVisits = useNewUserVisits;