import { create } from 'zustand';

interface UserPermissions {
  // Core role information
  userId: string | null;
  role: 'Admin' | 'EM' | 'Visitor' | 'Pending' | null;
  isAdmin: boolean;
  isEM: boolean;
  
  // Capability flags
  capabilities: {
    canEditVisits: boolean;
    canDeleteVisits: boolean;
    canCreateVisits: boolean;
    canViewAllVisits: boolean;
    canManageUsers: boolean;
    canManageCCIs: boolean;
    canSeeClusterFeedback: boolean;
    canExportData: boolean;
    canImportData: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
  };
  
  // CCI-specific permissions
  assignedCCIs: string[];
  canEditCCIVisits: (cciId: string) => boolean;
  
  // Permission cache for performance
  permissionCache: Record<string, { result: boolean; timestamp: number }>;
}

interface PermissionsState extends UserPermissions {
  // User management
  setUser: (userId: string | null, role: string | null, assignedCCIs?: string[]) => void;
  clearUser: () => void;
  
  // Permission checks
  canEditVisit: (visitId: string, filledByUid: string) => boolean;
  canViewVisit: (visitId: string, filledByUid: string) => boolean;
  canDeleteVisit: (visitId: string, filledByUid: string) => boolean;
  
  // Cache management
  clearPermissionCache: () => void;
  invalidatePermission: (key: string) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  // Initial state
  userId: null,
  role: null,
  isAdmin: false,
  isEM: false,
  
  capabilities: {
    canEditVisits: false,
    canDeleteVisits: false,
    canCreateVisits: false,
    canViewAllVisits: false,
    canManageUsers: false,
    canManageCCIs: false,
    canSeeClusterFeedback: false,
    canExportData: false,
    canImportData: false,
    canViewReports: false,
    canManageSettings: false
  },
  
  assignedCCIs: [],
  canEditCCIVisits: (cciId: string) => {
    const { assignedCCIs, isAdmin } = get();
    return isAdmin || assignedCCIs.includes(cciId);
  },
  
  permissionCache: {},
  
  // User management
  setUser: (userId: string | null, role: string | null, assignedCCIs: string[] = []) => {
    const normalizedRole = role as PermissionsState['role'];
    const isAdmin = normalizedRole === 'Admin';
    const isEM = normalizedRole === 'EM' || assignedCCIs.length > 0;
    
    // Debug logging to help identify the issue
    console.log('setUser debug:', {
      userId,
      role,
      normalizedRole,
      isAdmin,
      isEM,
      assignedCCIs
    });
    
    // Calculate capabilities based on role
    const capabilities = {
      canEditVisits: isAdmin || isEM,
      canDeleteVisits: isAdmin,
      canCreateVisits: isAdmin || isEM,
      canViewAllVisits: isAdmin,
      canManageUsers: isAdmin,
      canManageCCIs: isAdmin,
      canSeeClusterFeedback: isAdmin,
      canExportData: isAdmin,
      canImportData: isAdmin,
      canViewReports: isAdmin || isEM,
      canManageSettings: isAdmin
    };
    
    set({
      userId,
      role: normalizedRole,
      isAdmin,
      isEM,
      capabilities,
      assignedCCIs,
      permissionCache: {} // Clear cache when user changes
    });
  },
  
  clearUser: () => {
    set({
      userId: null,
      role: null,
      isAdmin: false,
      isEM: false,
      capabilities: {
        canEditVisits: false,
        canDeleteVisits: false,
        canCreateVisits: false,
        canViewAllVisits: false,
        canManageUsers: false,
        canManageCCIs: false,
        canSeeClusterFeedback: false,
        canExportData: false,
        canImportData: false,
        canViewReports: false,
        canManageSettings: false
      },
      assignedCCIs: [],
      permissionCache: {}
    });
  },
  
  // Permission checks
  canEditVisit: (visitId: string, filledByUid: string) => {
    const state = get();
    const { userId, isAdmin, capabilities, permissionCache } = state;
    
    // Admin can edit any visit
    if (isAdmin) return true;
    
    // Check cache first
    const cacheKey = `edit_${visitId}`;
    const cached = permissionCache[cacheKey];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.result;
    }
    
    // Debug logging to help identify the issue
    console.log('canEditVisit debug:', {
      visitId,
      filledByUid,
      userId,
      isAdmin,
      canEditVisits: capabilities.canEditVisits,
      userIdMatch: userId === filledByUid,
      userIdType: typeof userId,
      filledByUidType: typeof filledByUid,
      role: state.role,
      isEM: state.isEM
    });
    
    // Business rule: Only the creator can edit their visit
    const canEdit = capabilities.canEditVisits && userId === filledByUid;
    
    // Cache the result
    set({
      permissionCache: {
        ...permissionCache,
        [cacheKey]: { result: canEdit, timestamp: now }
      }
    });
    
    return canEdit;
  },
  
  canViewVisit: (visitId: string, _filledByUid: string) => {
    const state = get();
    const { isAdmin, permissionCache } = state;
    
    // Admin can view any visit
    if (isAdmin) return true;
    
    // Check cache first
    const cacheKey = `view_${visitId}`;
    const cached = permissionCache[cacheKey];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.result;
    }
    
    // Business rule: Users can view visits they can see (handled by Firestore rules)
    const canView = true; // If they can see it, they can view it
    
    // Cache the result
    set({
      permissionCache: {
        ...permissionCache,
        [cacheKey]: { result: canView, timestamp: now }
      }
    });
    
    return canView;
  },
  
  canDeleteVisit: (visitId: string, _filledByUid: string) => {
    const state = get();
    const { isAdmin, capabilities, permissionCache } = state;
    
    // Admin can delete any visit
    if (isAdmin) return true;
    
    // Check cache first
    const cacheKey = `delete_${visitId}`;
    const cached = permissionCache[cacheKey];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.result;
    }
    
    // Business rule: Only admin can delete visits
    const canDelete = capabilities.canDeleteVisits;
    
    // Cache the result
    set({
      permissionCache: {
        ...permissionCache,
        [cacheKey]: { result: canDelete, timestamp: now }
      }
    });
    
    return canDelete;
  },
  
  // Cache management
  clearPermissionCache: () => {
    set({ permissionCache: {} });
  },
  
  invalidatePermission: (key: string) => {
    const { permissionCache } = get();
    const newCache = { ...permissionCache };
    delete newCache[key];
    set({ permissionCache: newCache });
  }
}));
