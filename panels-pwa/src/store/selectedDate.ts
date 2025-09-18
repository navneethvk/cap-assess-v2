
import { create } from 'zustand';

interface SelectedDateState {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

export const useSelectedDateStore = create<SelectedDateState>((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
