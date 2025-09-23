/**
 * @deprecated This hook is deprecated. Use useVisitsInRange from '@/hooks/useVisitQueries' instead.
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 * Please migrate to the new centralized query system.
 */

import { useVisitsInRange as useNewVisitsInRange } from './useVisitQueries';

/**
 * @deprecated Use useVisitsInRange from '@/hooks/useVisitQueries' instead
 */
export const useVisitsInRange = useNewVisitsInRange;

export default useVisitsInRange;