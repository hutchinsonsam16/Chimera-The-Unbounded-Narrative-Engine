import React, { useEffect } from 'react';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { GameUI } from './components/game/GameUI';
import { FullSettingsDialog } from './components/settings/FullSettingsDialog';
import { useStore } from './hooks/useStore';
import { GamePhase } from './types';
import { ToastContainer } from './components/ui/Toast';
import { DiceRoller } from './components/game/DiceRoller';
import { AmbientAudioPlayer } from './components/game/AmbientAudioPlayer';
import { CommandPalette } from './components/ui/CommandPalette';
import { ExportFormatModal } from './components/game/ExportFormatModal';
import { ImageEditorModal } from './components/game/ImageEditorModal';
import { InteractiveTutorial } from './components/game/InteractiveTutorial';
import { ApiKeyModal } from './components/onboarding/ApiKeyModal';
import { Spinner } from './components/ui/Spinner';

const ThemeManager: React.FC = () => {
  // FIX: Correctly finds the active theme from the themes array to prevent crashes.
  const { themes, activeThemeName } = useStore((state) => state.settings);
  const theme = themes.find(t => t.name === activeThemeName);

  useEffect(() => {
    // Guard clause to ensure the theme exists before trying to use it.
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-bg', theme.colors.bg);
    root.style.fontSize = `${theme.baseFontSize}px`;

    if (theme.backgroundImage) {
      document.body.style.backgroundImage = `url(${theme.backgroundImage})`;
    } else {
      document.body.style.backgroundImage = 'none';
    }
    
    const createFontLink = (fontFamily: string, id: string) => {
        const existingLink = document.getElementById(id);
        if (existingLink) existingLink.remove();
        if (fontFamily !== 'Inter, sans-serif' && fontFamily !== 'Orbitron, sans-serif') {
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

const AppContent: React.FC = () => {
  const {
    gamePhase,
    isSettingsOpen,
    isDiceRollerOpen,
    isAudioPlayerOpen,
    toggleSettings,
    isCommandPaletteOpen,
    isExportModalOpen,
    isImageEditorOpen,
    hasCompletedTutorial,
    healthStatus
  } = useStore(state => ({
    gamePhase: state.gameState.phase,
    isSettingsOpen: state.isSettingsOpen,
    isDiceRollerOpen: state.isDiceRollerOpen,
    isAudioPlayerOpen: state.isAudioPlayerOpen,
    toggleSettings: state.toggleSettings,
    isCommandPaletteOpen: state.isCommandPaletteOpen,
    isExportModalOpen: state.isExportModalOpen,
    isImageEditorOpen: state.isImageEditorOpen,
    hasCompletedTutorial: state.settings.hasCompletedTutorial,
    healthStatus: state.character.status.Health,
  }));

  const isWounded = healthStatus?.toLowerCase().includes('wounded') || healthStatus?.toLowerCase().includes('injured');
  const showTutorial = gamePhase === GamePhase.PLAYING && !hasCompletedTutorial;

  return (
    <>
      <div className={`bg-[var(--color-bg)] text-[var(--color-text)] font-[var(--font-body)] h-screen w-screen overflow-hidden flex flex-col transition-all duration-500 ${isWounded ? 'low-health-effect' : ''}`}>
        {gamePhase === GamePhase.ONBOARDING && <OnboardingWizard />}
        {gamePhase === GamePhase.PLAYING && <GameUI />}
        {isSettingsOpen && <FullSettingsDialog onClose={toggleSettings} />}
        {isCommandPaletteOpen && <CommandPalette />}
        {isExportModalOpen && <ExportFormatModal />}
        {isImageEditorOpen.open && <ImageEditorModal logEntryId={isImageEditorOpen.logEntryId!} />}
        {isDiceRollerOpen && <DiceRoller />}
        {isAudioPlayerOpen && <AmbientAudioPlayer />}
        {showTutorial && <InteractiveTutorial />}
      </div>
       <style>{`
            .low-health-effect {
                animation: pulse-red 2s infinite;
            }
            @keyframes pulse-red {
                0% { box-shadow: inset 0 0 0px rgba(255, 0, 0, 0.2); }
                50% { box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.5); }
                100% { box-shadow: inset 0 0 0px rgba(255, 0, 0, 0.2); }
            }
        `}</style>
    </>
  );
};

const App: React.FC = () => {
  const { apiKeyStatus, validateApiKey, toggleCommandPalette } = useStore(state => ({
      apiKeyStatus: state.apiKeyStatus,
      validateApiKey: state.validateApiKey,
      toggleCommandPalette: state.toggleCommandPalette,
  }));

  // This hook now has an empty dependency array.
  // It will run ONLY ONCE when the application first loads. This is the fix for the infinite loop.
  useEffect(() => {
    validateApiKey();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // <-- EMPTY DEPENDENCY ARRAY FIX

  const renderContent = () => {
    switch (apiKeyStatus) {
      case 'unvalidated':
      case 'validating':
        return (
          <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900">
            <Spinner />
            <p className="mt-4 text-gray-400">Validating API connection...</p>
          </div>
        );
      case 'invalid':
        return <ApiKeyModal />;
      case 'valid':
        return <AppContent />;
      default:
        return <div>An unexpected error occurred. Please refresh the page.</div>;
    }
  };

  return (
    <>
      <ThemeManager />
      <ToastContainer />
      {renderContent()}
    </>
  );
};

export default App;