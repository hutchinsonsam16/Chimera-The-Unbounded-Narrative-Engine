
import { create, StoreApi } from 'zustand';
import { AppState, GameData } from '../types';
import { createRootSlice } from '../store/store';
// FIX: The Zundo type was not being recognized as a generic. Manually defining the store shape with temporal state.
import { TemporalState } from 'zundo';

// The temporal middleware adds its own state, so we need to reflect that in the type
type StoreWithHistory = AppState & { temporal: StoreApi<TemporalState<GameData>> };

export const useStore = create<StoreWithHistory>()(
  createRootSlice
);

// We create selectors to easily access history functions
export const useUndo = () => useStore((state) => state.temporal.getState().undo);
export const useRedo = () => useStore((state) => state.temporal.getState().redo);
export const useCanUndo = () => useStore((state) => state.temporal.getState().pastStates.length > 0);
export const useCanRedo = () => useStore((state) => state.temporal.getState().futureStates.length > 0);