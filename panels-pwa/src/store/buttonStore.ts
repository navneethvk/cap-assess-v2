import { create } from 'zustand';

export type ButtonType = 'popup' | 'tab' | 'page' | 'action';

interface ButtonState {
  id: string;
  type: ButtonType;
  isPressed: boolean;
  originalText?: string;
}

interface ButtonStore {
  pressedButtons: Record<string, ButtonState>;
  setPressedButton: (id: string, type: ButtonType, originalText?: string) => void;
  clearPressedButton: (id: string) => void;
  clearAllPressed: () => void;
  isPressedButton: (id: string) => boolean;
  getPressedButton: (id: string) => ButtonState | undefined;
}

export const useButtonStore = create<ButtonStore>((set, get) => ({
  pressedButtons: {},
  
  setPressedButton: (id: string, type: ButtonType, originalText?: string) => {
    set((state) => {
      const newState = { ...state.pressedButtons };
      
      // If this is a popup or tab, clear other pressed buttons of the same type
      if (type === 'popup' || type === 'tab') {
        Object.keys(newState).forEach(buttonId => {
          if (newState[buttonId].type === type && buttonId !== id) {
            delete newState[buttonId];
          }
        });
      }
      
      // Set the new pressed button
      newState[id] = {
        id,
        type,
        isPressed: true,
        originalText
      };
      
      return { pressedButtons: newState };
    });
  },
  
  clearPressedButton: (id: string) => {
    set((state) => {
      const newState = { ...state.pressedButtons };
      delete newState[id];
      return { pressedButtons: newState };
    });
  },
  
  clearAllPressed: () => {
    set({ pressedButtons: {} });
  },
  
  isPressedButton: (id: string) => {
    return !!get().pressedButtons[id]?.isPressed;
  },
  
  getPressedButton: (id: string) => {
    return get().pressedButtons[id];
  }
}));