'use client';

import { useState } from 'react';
import type { GameMode, GameSettings } from '../types';
import { GameProvider, useGame } from '../contexts/GameContext';
import MainMenu from '../components/menu/MainMenu';
import GameSetup from '../components/menu/GameSetup';
import GameScreen from '../components/game/GameScreen';
import OnlineLobby from '../components/lobby/OnlineLobby';
import MuteButton from '../components/ui/MuteButton';

type AppScreen = 'menu' | 'setup' | 'online-lobby' | 'playing';

function AppContent() {
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const { state, startGame, resetGame } = useGame();

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);
    if (mode === 'online-multiplayer') {
      setScreen('online-lobby');
    } else {
      setScreen('setup');
    }
  };

  const handleStart = (settings: GameSettings) => {
    startGame(settings);
    setScreen('playing');
  };

  const handleMainMenu = () => {
    resetGame();
    setSelectedMode(null);
    setScreen('menu');
  };

  if (screen === 'playing' && state) {
    return (
      <>
        <MuteButton />
        <GameScreen onMainMenu={handleMainMenu} />
      </>
    );
  }

  if (screen === 'online-lobby') {
    return (
      <OnlineLobby
        onStart={handleStart}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'setup' && selectedMode) {
    return (
      <GameSetup
        mode={selectedMode}
        onStart={handleStart}
        onBack={() => setScreen('menu')}
      />
    );
  }

  return <MainMenu onSelectMode={handleSelectMode} />;
}

export default function Home() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
