'use client';

interface Props {
  thinking?: boolean;
  text?: string;
  kidsMode?: boolean;
}

export default function PhariseeAvatar({ thinking, text, kidsMode }: Props) {
  return (
    <div className="flex items-start gap-3 max-w-md mx-auto bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
      {/* Avatar */}
      <div className="flex-shrink-0 w-16 h-16 rounded-full bg-purple-800 border-2 border-purple-400 flex items-center justify-center text-3xl">
        🧔
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-purple-300 text-sm">The Pharisee</p>

        {thinking ? (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-purple-200">Thinking</span>
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        ) : text ? (
          <p className={`${kidsMode ? 'text-lg' : 'text-base'} text-purple-100 italic mt-1`}>
            &ldquo;{text}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  );
}
