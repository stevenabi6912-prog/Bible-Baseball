'use client';

import { useGame } from '../../contexts/GameContext';
import BaseballDiamond from './BaseballDiamond';
import Scoreboard from './Scoreboard';
import HitSelector from './HitSelector';
import QuestionDisplay from './QuestionDisplay';
import ResultDisplay from './ResultDisplay';
import PassDevice from './PassDevice';
import GameOverScreen from './GameOverScreen';
import PhariseeAvatar from './PhariseeAvatar';

interface Props {
  onMainMenu: () => void;
}

export default function GameScreen({ onMainMenu }: Props) {
  const {
    state,
    lastResult,
    selectHit,
    submitAnswer,
    nextTurn,
    confirmDevicePass,
    resetGame,
    availableHitTypes,
    currentBatter,
    battingTeam,
    phariseeText,
    isComputerTurn,
  } = useGame();

  if (!state) return null;

  const kidsMode = state.kidsMode;

  // Game over
  if (state.turnPhase === 'game-over' || state.gameOver) {
    return (
      <GameOverScreen
        state={state}
        kidsMode={kidsMode}
        onPlayAgain={() => {
          resetGame();
        }}
        onMainMenu={() => {
          resetGame();
          onMainMenu();
        }}
      />
    );
  }

  // Pass device screen for local multiplayer
  if (state.waitingForPass && currentBatter) {
    return (
      <PassDevice
        playerName={currentBatter.name}
        onReady={confirmDevicePass}
        kidsMode={kidsMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-white p-4 pb-32">
      {/* Header: current batter */}
      <div className="text-center mb-3">
        <p className={`${kidsMode ? 'text-lg' : 'text-sm'} text-cream-400`}>
          {state.halfInning === 'top' ? '▲ Top' : '▼ Bottom'} of {state.currentInning}
        </p>
        <p className={`${kidsMode ? 'text-2xl' : 'text-xl'} font-bold text-gold-400`}>
          {isComputerTurn ? '🧔 The Pharisee' : `⚾ ${currentBatter?.name}`}
          <span className="text-cream-300 font-normal text-base ml-2">at bat</span>
        </p>
      </div>

      {/* Scoreboard */}
      <Scoreboard state={state} kidsMode={kidsMode} />

      {/* Diamond */}
      <BaseballDiamond bases={state.bases} outs={state.outs} kidsMode={kidsMode} />

      {/* Spacer to separate diamond from content below */}
      <div className="h-4" />

      {/* Computer thinking indicator */}
      {isComputerTurn && state.turnPhase === 'select-hit' && (
        <div className="mt-2">
          <PhariseeAvatar thinking kidsMode={kidsMode} />
        </div>
      )}

      {isComputerTurn && state.turnPhase === 'answer-question' && (
        <div className="mt-2">
          <PhariseeAvatar thinking kidsMode={kidsMode} />
        </div>
      )}

      {/* Human player: hit selection */}
      {!isComputerTurn && state.turnPhase === 'select-hit' && (
        <div className="mt-2">
          <HitSelector
            availableHits={availableHitTypes}
            onSelect={selectHit}
            kidsMode={kidsMode}
          />
        </div>
      )}

      {/* Human player: answer question */}
      {!isComputerTurn && state.turnPhase === 'answer-question' && state.currentQuestion && (
        <div className="mt-2">
          <QuestionDisplay
            question={state.currentQuestion}
            onAnswer={submitAnswer}
            kidsMode={kidsMode}
          />
        </div>
      )}

      {/* Result display */}
      {state.turnPhase === 'result' && (
        <div className="mt-2">
          {isComputerTurn && phariseeText && (
            <div className="mb-4">
              <PhariseeAvatar text={phariseeText} kidsMode={kidsMode} />
            </div>
          )}
          <ResultDisplay
            state={state}
            correct={lastResult?.correct ?? false}
            runsScored={lastResult?.runsScored ?? 0}
            onContinue={nextTurn}
            phariseeText={isComputerTurn ? phariseeText : undefined}
            kidsMode={kidsMode}
          />
        </div>
      )}
    </div>
  );
}
