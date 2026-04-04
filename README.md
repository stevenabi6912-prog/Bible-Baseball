# Bible Baseball

A Bible trivia game with baseball mechanics, built for **Faith Baptist Church of Chelsea**.

Test your KJV Bible knowledge by stepping up to the plate! Choose your hit type (Single, Double, Triple, or Home Run), answer a Bible question of matching difficulty, and watch your runners advance around the bases.

## Features

- **3 Game Modes**: vs. The Pharisee (AI), Local Multiplayer (2-6 players), Online Multiplayer
- **240+ KJV Bible Questions** across 4 difficulty tiers
- **Kids Mode** with simplified questions and larger UI
- **The Pharisee** AI opponent with 3 difficulty levels and fun flavor text
- **Baseball Diamond** with animated base runners and scoreboard
- **Rotation Rule** — players must try all 4 hit types before repeating
- **Sound Effects** via Howler.js (crowd cheers, organ music, etc.)
- **Mobile-First** responsive design for phones and tablets
- **Online Multiplayer** with room codes via Supabase Realtime

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** (custom navy/gold/cream theme)
- **Howler.js** (sound management)
- **Supabase** (auth + real-time database for online multiplayer)
- **Deploy-ready** for Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

The app works fully for **vs. Computer** and **Local Multiplayer** without any configuration. Online Multiplayer requires Supabase setup (see below).

## Supabase Setup (Online Multiplayer Only)

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in your Supabase SQL Editor
3. Enable Google and/or Apple auth providers in Supabase Auth settings
4. Copy your project URL and anon key
5. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

6. Restart the dev server

## Question Schema

Questions live in `src/data/questions.json`. Each question:

```json
{
  "id": "q001",
  "difficulty": "single",
  "format": "multiple-choice",
  "question": "Who built the ark?",
  "options": ["Moses", "Noah", "Abraham", "David"],
  "answer": "Noah",
  "reference": "Genesis 6:14",
  "kids": true,
  "category": "OT"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique ID (e.g., "q001") |
| `difficulty` | `"single"` \| `"double"` \| `"triple"` \| `"homerun"` | Maps to hit type |
| `format` | `"multiple-choice"` \| `"fill-in-the-blank"` | Question format |
| `question` | string | The question text |
| `options` | string[] | 4 choices (multiple-choice only) |
| `answer` | string | Correct answer text |
| `reference` | string | KJV Bible reference |
| `kids` | boolean | Include in kids mode pool |
| `category` | string | `"OT"`, `"NT"`, `"Gospels"`, etc. |

### Adding Questions

1. Open `src/data/questions.json`
2. Add new question objects following the schema above
3. Use unique IDs (continue from the highest existing ID)
4. For multiple-choice: `answer` must exactly match one of the `options`
5. For fill-in-the-blank: omit `options`, put the answer in `answer`

## Game Rules

- **Innings**: Selectable (3, 5, 7, or 9)
- **At-Bat**: Choose a hit type, answer a matching question
- **Correct**: Hit occurs, runners advance accordingly
- **Wrong**: Automatic out, runners stay
- **3 outs** per half-inning, then teams switch
- **Rotation Rule**: Must try all 4 hit types before repeating (per half-inning)

### Hit Types & Runner Advancement

| Hit | Batter Goes To | Runners Advance |
|-----|---------------|-----------------|
| Single | 1st base | 1 base each |
| Double | 2nd base | 2 bases each |
| Triple | 3rd base | 3 bases each |
| Home Run | Scores | All score |

## Sound Effects

Place MP3 files in `public/sounds/`:

| File | Purpose |
|------|---------|
| `organ-loop.mp3` | Background music (looping) |
| `crowd-cheer.mp3` | Correct answer |
| `crowd-groan.mp3` | Wrong answer / out |
| `homerun-fanfare.mp3` | Home run |
| `crowd-react.mp3` | Runner advances |
| `victory-jingle.mp3` | Game won |
| `defeat-jingle.mp3` | Game lost |

The app works without sound files — missing files are silently ignored.

## Project Structure

```
src/
├── app/                    # Next.js pages
├── components/
│   ├── game/               # Game UI (diamond, scoreboard, questions)
│   ├── lobby/              # Online multiplayer lobby
│   ├── menu/               # Main menu, game setup
│   └── ui/                 # Shared components (mute button)
├── contexts/               # React context (GameContext)
├── data/
│   └── questions.json      # 240+ Bible questions
├── lib/
│   ├── game-engine.ts      # Pure game logic (state machine)
│   ├── questions.ts        # Question selection & anti-repeat
│   ├── pharisee.ts         # AI opponent logic
│   ├── sounds.ts           # Howler.js sound manager
│   ├── supabase.ts         # Supabase client
│   └── online.ts           # Online multiplayer functions
└── types/
    └── index.ts            # TypeScript interfaces
```

## Deployment

Deploy to Vercel:

```bash
npm run build    # Verify production build
vercel deploy    # Deploy to Vercel
```

Set environment variables in Vercel dashboard for online multiplayer.

## License

Built for Faith Baptist Church of Chelsea.
