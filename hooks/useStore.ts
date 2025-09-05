
import { create } from 'zustand';
import { AppState } from '../types';
import { createRootSlice } from '../store/store';

export const useStore = create<AppState>()((...a) => ({
  ...createRootSlice(...a),
}));
