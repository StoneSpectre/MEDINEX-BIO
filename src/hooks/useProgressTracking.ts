import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'physiology_progress';

export interface ModuleProgress {
  cardiovascular: boolean;
  renal: boolean;
  immunology: boolean;
  systemThinking: boolean;
}

const defaultProgress: ModuleProgress = {
  cardiovascular: false,
  renal: false,
  immunology: false,
  systemThinking: false,
};

export function useProgressTracking() {
  const [progress, setProgress] = useState<ModuleProgress>(defaultProgress);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProgress({ ...defaultProgress, ...JSON.parse(stored) });
      } catch {
        setProgress(defaultProgress);
      }
    }
  }, []);

  const markModuleVisited = useCallback((module: keyof ModuleProgress) => {
    setProgress((prev) => {
      const updated = { ...prev, [module]: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress(defaultProgress);
  }, []);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalModules = Object.keys(progress).length;
  const progressPercent = Math.round((completedCount / totalModules) * 100);

  return { progress, markModuleVisited, resetProgress, completedCount, totalModules, progressPercent };
}
