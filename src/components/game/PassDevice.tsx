'use client';

interface Props {
  playerName: string;
  onReady: () => void;
  kidsMode?: boolean;
}

export default function PassDevice({ playerName, onReady, kidsMode }: Props) {
  const textSize = kidsMode ? 'text-2xl' : 'text-xl';

  return (
    <div className="fixed inset-0 bg-navy-950 flex items-center justify-center z-40 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-6xl mb-4">📱</div>
        <h2 className={`${kidsMode ? 'text-3xl' : 'text-2xl'} font-bold text-gold-400`}>
          Pass the Device!
        </h2>
        <p className={`${textSize} text-cream-200`}>
          Hand the device to
        </p>
        <p className={`text-4xl font-bold text-white`}>
          {playerName}
        </p>
        <p className="text-cream-400 text-sm">
          {kidsMode ? 'No peeking!' : "Make sure the previous player isn't looking!"}
        </p>
        <button
          onClick={onReady}
          className={`
            w-full p-5 rounded-xl font-bold ${textSize}
            bg-gold-500 text-navy-900 hover:bg-gold-400
            active:scale-95 transition-all shadow-lg mt-8
          `}
        >
          {kidsMode ? "I'm Ready! ⚾" : "I'm Ready"}
        </button>
      </div>
    </div>
  );
}
