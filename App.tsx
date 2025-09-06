import React, { useEffect } from 'react';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { GameUI } from './components/game/GameUI';
import { FullSettingsDialog } from './components/settings/FullSettingsDialog';
import { useStore } from './hooks/useStore';
import { GamePhase } from './types';
import { ToastContainer } from './components/ui/Toast';
import { DiceRoller } from './components/game/DiceRoller';
import { AmbientAudioPlayer } from './components/game/AmbientAudioPlayer';

const ThemeManager: React.FC = () => {
  const theme = useStore((state) => state.settings.theme);

  useEffect(() => {
    // Colors
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-bg', theme.colors.bg);
    
    // Font size
    root.style.fontSize = `${theme.baseFontSize}px`;

    // Background Image
    if (theme.backgroundImage) {
      document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
    }
    
    // Google Fonts
    const createFontLink = (fontFamily: string, id: string) => {
        const existingLink = document.getElementById(id);
        if (existingLink) {
            existingLink.remove();
        }
        if (fontFamily !== 'Inter, sans-serif' && fontFamily !== 'Orbitron, sans-serif') { // Don't load system fonts
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.split(',')[0].replace(/ /g, '+')}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    };
    
    createFontLink(theme.fonts.body, 'font-body-link');
    createFontLink(theme.fonts.heading, 'font-heading-link');
    root.style.setProperty('--font-body', theme.fonts.body);
    root.style.setProperty('--font-heading', theme.fonts.heading);

  }, [theme]);

  return null;
};

const App: React.FC = () => {
  const gamePhase = useStore((state) => state.gameState.phase);
  const isSettingsOpen = useStore((state) => state.isSettingsOpen);
  const isDiceRollerOpen = useStore((state) => state.isDiceRollerOpen);
  const isAudioPlayerOpen = useStore((state) => state.isAudioPlayerOpen);
  const toggleSettings = useStore((state) => state.toggleSettings);

  return (
    <>
      <ThemeManager />
      <ToastContainer />
      <div className="bg-[var(--color-bg)] text-[var(--color-text)] font-[var(--font-body)] h-screen w-screen overflow-hidden flex flex-col">
        {gamePhase === GamePhase.ONBOARDING && <OnboardingWizard />}
        {gamePhase === GamePhase.PLAYING && <GameUI />}
        {isSettingsOpen && <FullSettingsDialog onClose={toggleSettings} />}
        {isDiceRollerOpen && <DiceRoller />}
        {isAudioPlayerOpen && <AmbientAudioPlayer />}
      </div>
    </>
  );
};

export default App;
