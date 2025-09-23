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
  setSlots: (slots) => set(slots),
  clearSlots: () => set({ customLeft: undefined, customCenter: undefined, customRight: undefined }),
}));


