
import React, { useEffect } from 'react';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { GameUI } from './components/game/GameUI';
import { FullSettingsDialog } from './components/settings/FullSettingsDialog';
import { useStore } from './hooks/useStore';
import { GamePhase } from './types';

const ThemeManager: React.FC = () => {
  const theme = useStore((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-bg', theme.colors.bg);
    root.style.setProperty('--font-body', theme.fonts.body);
    root.style.setProperty('--font-heading', theme.fonts.heading);
    if (theme.backgroundImage) {
      document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
  }, [theme]);

  return null;
};

const App: React.FC = () => {
  const gamePhase = useStore((state) => state.gameState.phase);
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);
  const toggleSettings = useStore((state) => state.toggleSettings);

  return (
    <>
      <ThemeManager />
      <div className="bg-gray-900 text-gray-100 font-sans h-screen w-screen overflow-hidden flex flex-col">
        {gamePhase === GamePhase.ONBOARDING && <OnboardingWizard />}
        {gamePhase === GamePhase.PLAYING && <GameUI />}
        {isSettingsOpen && <FullSettingsDialog onClose={toggleSettings} />}
      </div>
    </>
  );
};

export default App;
