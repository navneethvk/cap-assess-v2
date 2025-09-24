import { create } from 'zustand';

interface ScrollPosition {
  x: number;
  y: number;
}

interface UIState {
  // Current page/view state
  currentPage: string;
  setCurrentPage: (page: string) => void;
  
  // Last focused date (for date pickers, calendars)
  lastFocusedDate: Date | null;
  setLastFocusedDate: (date: Date | null) => void;
  
  // Scroll positions per route
  scrollPositions: Record<string, ScrollPosition>;
  setScrollPosition: (route: string, position: ScrollPosition) => void;
  getScrollPosition: (route: string) => ScrollPosition | null;
  clearScrollPosition: (route: string) => void;
  
  // Modal/dialog state
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  
  // Loading states
  loadingStates: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  
  // Form states
  formStates: Record<string, any>;
  setFormState: (formId: string, state: any) => void;
  getFormState: (formId: string) => any;
  clearFormState: (formId: string) => void;
  
  // Temporary UI flags
  flags: Record<string, boolean>;
  setFlag: (key: string, value: boolean) => void;
  getFlag: (key: string) => boolean;
  toggleFlag: (key: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Current page state
  currentPage: '',
  setCurrentPage: (page: string) => set({ currentPage: page }),
  
  // Date state
  lastFocusedDate: null,
  setLastFocusedDate: (date: Date | null) => set({ lastFocusedDate: date }),
  
  // Scroll positions
  scrollPositions: {},
  setScrollPosition: (route: string, position: ScrollPosition) => 
    set((state) => ({
      scrollPositions: {
        ...state.scrollPositions,
        [route]: position
      }
    })),
  getScrollPosition: (route: string) => {
    const { scrollPositions } = get();
    return scrollPositions[route] || null;
  },
  clearScrollPosition: (route: string) =>
    set((state) => {
      const newPositions = { ...state.scrollPositions };
      delete newPositions[route];
      return { scrollPositions: newPositions };
    }),
  
  // Modal state
  activeModal: null,
  setActiveModal: (modal: string | null) => set({ activeModal: modal }),
  
  // Loading states
  loadingStates: {},
  setLoading: (key: string, loading: boolean) =>
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading
      }
    })),
  isLoading: (key: string) => {
    const { loadingStates } = get();
    return loadingStates[key] || false;
  },
  
  // Form states
  formStates: {},
  setFormState: (formId: string, state: any) =>
    set((state) => ({
      formStates: {
        ...state.formStates,
        [formId]: state
      }
    })),
  getFormState: (formId: string) => {
    const { formStates } = get();
    return formStates[formId] || null;
  },
  clearFormState: (formId: string) =>
    set((state) => {
      const newFormStates = { ...state.formStates };
      delete newFormStates[formId];
      return { formStates: newFormStates };
    }),
  
  // Temporary flags
  flags: {},
  setFlag: (key: string, value: boolean) =>
    set((state) => ({
      flags: {
        ...state.flags,
        [key]: value
      }
    })),
  getFlag: (key: string) => {
    const { flags } = get();
    return flags[key] || false;
  },
  toggleFlag: (key: string) =>
    set((state) => ({
      flags: {
        ...state.flags,
        [key]: !state.flags[key]
      }
    }))
}));
