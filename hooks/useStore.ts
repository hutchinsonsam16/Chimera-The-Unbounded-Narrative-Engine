import { create, StoreApi } from 'zustand';
import { AppState, GameData } from '../types';
import { createRootSlice } from '../store/store';
// FIX: The Zundo type was not being recognized as a generic. Manually defining the store shape with temporal state.
import { TemporalState } from 'zundo';
import { persist, createJSONStorage } from 'zustand/middleware';

// The temporal middleware adds its own state, so we need to reflect that in the type
type StoreWithHistory = AppState & { temporal: StoreApi<TemporalState<GameData>> };

export const useStore = create<StoreWithHistory>()(
  persist(
    // FIX: Cast to any to resolve a complex cross-module type inference issue.
    // The `temporal` middleware from `zundo` augments the state, but TypeScript
    // was not inferring the new state shape correctly across files.
    createRootSlice as any,
    {
      name: 'chimera-settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
      // onRehydrateStorage: () => (state) => {
      //   if (state) state.setHasHydrated(true)
      // },
    }
  )
);

// We create selectors to easily access history functions
export const useUndo = () => useStore((state) => state.temporal.getState().undo);
export const useRedo = () => useStore((state) => state.temporal.getState().redo);
export const useCanUndo = () => useStore((state) => state.temporal.getState().pastStates.length > 0);
export const useCanRedo = () => useStore((state) => state.temporal.getState().futureStates.length > 0);