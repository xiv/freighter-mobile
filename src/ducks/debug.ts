import { create } from "zustand";

interface DebugState {
  // App version override for testing app updates in DEV mode
  overriddenAppVersion: string | null;
  setOverriddenAppVersion: (version: string | null) => void;
  clearOverriddenAppVersion: () => void;
}

export const useDebugStore = create<DebugState>()((set) => ({
  overriddenAppVersion: null,
  setOverriddenAppVersion: (version: string | null) =>
    set({ overriddenAppVersion: version }),
  clearOverriddenAppVersion: () => set({ overriddenAppVersion: null }),
}));
