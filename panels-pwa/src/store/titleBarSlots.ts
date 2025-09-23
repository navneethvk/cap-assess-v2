import { create } from 'zustand';

interface TitleBarSlotsState {
  customLeft?: React.ReactNode;
  customCenter?: React.ReactNode;
  customRight?: React.ReactNode;
  setSlots: (slots: { customLeft?: React.ReactNode; customCenter?: React.ReactNode; customRight?: React.ReactNode }) => void;
  clearSlots: () => void;
}

export const useTitleBarSlots = create<TitleBarSlotsState>((set) => ({
  customLeft: undefined,
  customCenter: undefined,
  customRight: undefined,
  setSlots: (slots) =>
    set((state) => {
      const { customLeft, customCenter, customRight } = slots
      if (
        state.customLeft === customLeft &&
        state.customCenter === customCenter &&
        state.customRight === customRight
      ) {
        return state
      }
      return {
        ...state,
        customLeft,
        customCenter,
        customRight,
      }
    }),
  clearSlots: () =>
    set((state) => {
      if (!state.customLeft && !state.customCenter && !state.customRight) {
        return state
      }
      return {
        ...state,
        customLeft: undefined,
        customCenter: undefined,
        customRight: undefined,
      }
    }),
}));



