import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameItem } from '../types';
import { GAMES_DATA } from '../data/games';
import { SafeImage } from './SafeImage';
import {
  Search,
  Gamepad2,
  Play,
  RotateCcw,
  Heart,
  Terminal,
  Trophy,
} from 'lucide-react';

interface GamesTabProps {
  initialGameId?: string | null;
}

export const GamesTab: React.FC<GamesTabProps> = ({ initialGameId }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeGame, setActiveGame] = useState<GameItem | null>(() => {
    if (initialGameId) {
      const found = GAMES_DATA.find((g) => g.id === initialGameId);
      if (found) return found;
    }
    return null;
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem('k1ngkell_favorite_games') || '["math-rush", "snake-retro"]'
      );
    } catch {
      return ['math-rush', 'snake-retro'];
    }
  });
  const [luminStatus, setLuminStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const luminLoadedRef = useRef(false);

  useEffect(() => {
    if (initialGameId) {
      const found = GAMES_DATA.find((g) => g.id === initialGameId);
      if (found) setActiveGame(found);
    }
  }, [initialGameId]);

  // Handle Lumin SDK initialization when Lumin game is opened
  useEffect(() => {
    if (activeGame?.playType === 'lumin') {
      if (luminLoadedRef.current && (window as any).Lumin) {
        try {
          (window as any).Lumin.init({ container: '#games', theme: 'dark' });
          setLuminStatus('ready');
        } catch {
          setLuminStatus('fallback');
        }
        return;
      }

      setLuminStatus('loading');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/luminsdk/script@latest/lumin.min.js';
      script.async = true;
      script.onload = () => {
        luminLoadedRef.current = true;
        if ((window as any).Lumin) {
          try {
            (window as any).Lumin.init({ container: '#games', theme: 'dark' });
            setLuminStatus('ready');
          } catch {
            setLuminStatus('fallback');
          }
        } else {
          setLuminStatus('fallback');
        }
      };
      script.onerror = () => {
        setLuminStatus('fallback');
      };
      document.body.appendChild(script);
    }
  }, [activeGame]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(id)
      ? favorites.filter((fav) => fav !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('k1ngkell_favorite_games', JSON.stringify(updated));
  };

  const filteredGames = GAMES_DATA.filter((game) => {
    const matchesCat =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'favorites'
        ? favorites.includes(game.id)
        : selectedCategory === 'lumin'
        ? game.playType === 'lumin'
        : game.category === selectedCategory;

    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Gamepad2 className="w-7 h-7 text-rose-600" />
            <span>K1ngkell Games Vault</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Featuring GN Math, classic web browser arcade, 2048, and Lumin SDK integration.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search games..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Games' },
          { id: 'favorites', label: 'Favorites' },
          { id: 'math', label: 'GN Math' },
          { id: 'lumin', label: 'Lumin Network' },
          { id: 'puzzle', label: 'Puzzles' },
          { id: 'arcade', label: 'Arcade' },
          { id: 'retro', label: 'Retro' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Game Stage */}
      {activeGame && (
        <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between text-white border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <div>
                <h3 className="font-bold text-lg">{activeGame.title}</h3>
                <span className="text-xs text-slate-400 capitalize">
                  {activeGame.category} Mode · {activeGame.plays.toLocaleString()} Plays
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => toggleFavorite(activeGame.id, e)}
                className={`p-2 rounded-lg border transition-colors ${
                  favorites.includes(activeGame.id)
                    ? 'text-rose-500 border-rose-500/50 bg-rose-500/10'
                    : 'text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Favorite"
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={() => setActiveGame(null)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Close Player
              </button>
            </div>
          </div>

          {/* Game Viewport Container */}
          <div className="w-full flex justify-center bg-black rounded-xl overflow-hidden min-h-[460px] relative items-center p-2">
            {activeGame.id === 'math-rush' && <MathRushGame />}
            {activeGame.id === 'game-2048' && <Game2048 />}
            {activeGame.id === 'snake-retro' && <SnakeGame />}
            {activeGame.id === 'space-defender' && <SpaceDefenderGame />}
            {activeGame.id === 'pong-duel' && <PongGame />}
            {activeGame.id === 'memory-matrix' && <MemoryMatrixGame />}
            {activeGame.playType === 'lumin' && (
              <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center p-6 text-white text-center">
                <div id="games" className="w-full h-full flex flex-col items-center justify-center">
                  <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-md mx-auto space-y-4">
                    <Terminal className="w-10 h-10 text-rose-500 mx-auto" />
                    <h4 className="font-bold text-base">Lumin SDK Web Runtime</h4>
                    <p className="text-xs text-slate-400">
                      {luminStatus === 'loading' && 'Connecting to Lumin CDN...'}
                      {luminStatus === 'ready' && 'Lumin SDK initialized inside #games container.'}
                      {luminStatus === 'fallback' &&
                        'Lumin external CDN was unreachable in this network; use any built-in HTML5 game above or retry.'}
                    </p>
                    <div className="p-3 bg-black/60 rounded-lg text-left font-mono text-[11px] text-emerald-400 border border-slate-800">
                      <div>Lumin.init(&#123; container: '#games', theme: 'dark' &#125;)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Games Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            onClick={() => setActiveGame(game)}
            className="group cursor-pointer rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="relative h-44 w-full overflow-hidden bg-slate-950">
              <SafeImage
                src={game.thumbnail}
                alt={game.title}
                fallbackText={game.title}
                fallbackIcon={<Gamepad2 className="w-8 h-8 text-rose-400" />}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

              <div className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-600 text-white uppercase tracking-wider">
                {game.category}
              </div>

              <button
                onClick={(e) => toggleFavorite(game.id, e)}
                className={`absolute top-3 right-3 p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                  favorites.includes(game.id)
                    ? 'text-rose-500 bg-rose-500/20'
                    : 'text-white/70 hover:text-white bg-black/40'
                }`}
              >
                <Heart className="w-4 h-4 fill-current" />
              </button>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                <span className="font-bold text-sm truncate">{game.title}</span>
                <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                  <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                {game.description}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="capitalize">{game.playType} Module</span>
                <span className="tabular-nums">{game.plays.toLocaleString()} plays</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================= GN Math: Speed Formula =================
const MathRushGame: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [num1, setNum1] = useState(5);
  const [num2, setNum2] = useState(7);
  const [op, setOp] = useState<'+' | '-' | '×'>('+');
  const [answer, setAnswer] = useState('');
  const [combo, setCombo] = useState(1);

  const generateProblem = () => {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const chosenOp = ops[Math.floor(Math.random() * ops.length)];
    setOp(chosenOp);
    if (chosenOp === '×') {
      setNum1(Math.floor(Math.random() * 9) + 2);
      setNum2(Math.floor(Math.random() * 9) + 2);
    } else {
      setNum1(Math.floor(Math.random() * 50) + 10);
      setNum2(Math.floor(Math.random() * 40) + 5);
    }
    setAnswer('');
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setCombo(1);
    setIsPlaying(true);
    generateProblem();
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setHighScore((prev) => Math.max(prev, score));
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timeLeft, score]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlaying) return;
    let expected = 0;
    if (op === '+') expected = num1 + num2;
    if (op === '-') expected = num1 - num2;
    if (op === '×') expected = num1 * num2;

    if (parseInt(answer.trim(), 10) === expected) {
      setScore((s) => s + 10 * combo);
      setCombo((c) => Math.min(c + 1, 5));
    } else {
      setCombo(1);
    }
    generateProblem();
  };

  return (
    <div className="w-full max-w-md p-6 text-center text-white space-y-6">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="tabular-nums">High: {highScore}</span>
        </div>
        <div className="font-mono text-rose-400 font-bold text-sm tabular-nums">
          Time: {timeLeft}s
        </div>
        <div className="text-blue-400 font-bold tabular-nums">Combo: x{combo}</div>
      </div>

      {isPlaying ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-xs font-mono text-emerald-400 tabular-nums">Score: {score}</div>
          <div className="text-5xl font-black font-mono tracking-wider py-4 bg-slate-900 rounded-2xl border border-slate-800">
            {num1} {op} {num2} = ?
          </div>
          <input
            type="number"
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            className="w-full text-center text-2xl font-bold font-mono py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors"
          >
            Submit Answer
          </button>
        </form>
      ) : (
        <div className="space-y-4 py-8">
          <h4 className="text-2xl font-bold">GN Math: Rapid Calculation</h4>
          <p className="text-xs text-slate-400">
            Solve as many mental arithmetic formulas as you can in 30 seconds. Build streaks for multiplier combos!
          </p>
          <div className="text-xl font-bold text-emerald-400 tabular-nums">
            Last Score: {score}
          </div>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg"
          >
            Start Speed Round
          </button>
        </div>
      )}
    </div>
  );
};

// ================= 2048 Game =================
const Game2048: React.FC = () => {
  const [board, setBoard] = useState<number[][]>(() => [
    [0, 2, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 4, 0],
    [0, 0, 0, 0],
  ]);
  const [score, setScore] = useState(0);

  const spawnTile = (grid: number[][]) => {
    const empty: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length > 0) {
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const restart = () => {
    const fresh = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    spawnTile(fresh);
    spawnTile(fresh);
    setBoard(fresh);
    setScore(0);
  };

  const slideRow = (row: number[]) => {
    let arr = row.filter((val) => val !== 0);
    let pts = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        pts += arr[i];
        arr[i + 1] = 0;
      }
    }
    arr = arr.filter((val) => val !== 0);
    while (arr.length < 4) arr.push(0);
    return { row: arr, pts };
  };

  const move = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((r) => [...r]);
        let addedPts = 0;

        if (direction === 'left') {
          for (let r = 0; r < 4; r++) {
            const { row, pts } = slideRow(newBoard[r]);
            newBoard[r] = row;
            addedPts += pts;
          }
        } else if (direction === 'right') {
          for (let r = 0; r < 4; r++) {
            const reversed = [...newBoard[r]].reverse();
            const { row, pts } = slideRow(reversed);
            newBoard[r] = row.reverse();
            addedPts += pts;
          }
        } else if (direction === 'up') {
          for (let c = 0; c < 4; c++) {
            const col = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
            const { row, pts } = slideRow(col);
            for (let r = 0; r < 4; r++) newBoard[r][c] = row[r];
            addedPts += pts;
          }
        } else if (direction === 'down') {
          for (let c = 0; c < 4; c++) {
            const col = [newBoard[3][c], newBoard[2][c], newBoard[1][c], newBoard[0][c]];
            const { row, pts } = slideRow(col);
            const rev = row.reverse();
            for (let r = 0; r < 4; r++) newBoard[r][c] = rev[r];
            addedPts += pts;
          }
        }

        if (JSON.stringify(newBoard) !== JSON.stringify(prevBoard)) {
          spawnTile(newBoard);
          if (addedPts > 0) setScore((s) => s + addedPts);
          return newBoard;
        }
        return prevBoard;
      });
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        if (e.key === 'ArrowLeft') move('left');
        if (e.key === 'ArrowRight') move('right');
        if (e.key === 'ArrowUp') move('up');
        if (e.key === 'ArrowDown') move('down');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  return (
    <div className="p-4 flex flex-col items-center select-none text-white space-y-4">
      <div className="flex items-center justify-between w-64 text-xs font-semibold">
        <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 tabular-nums">
          Score: {score}
        </span>
        <button
          onClick={restart}
          className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Game</span>
        </button>
      </div>

      <div className="w-68 h-68 bg-slate-900 border border-slate-700 p-2 rounded-2xl grid grid-cols-4 gap-2">
        {board.flat().map((val, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-center font-bold text-lg rounded-xl transition-all tabular-nums ${
              val === 0
                ? 'bg-slate-800/40'
                : val === 2
                ? 'bg-slate-200 text-slate-900'
                : val === 4
                ? 'bg-amber-100 text-slate-900'
                : val === 8
                ? 'bg-orange-400 text-white'
                : val === 16
                ? 'bg-orange-500 text-white'
                : val === 32
                ? 'bg-rose-500 text-white'
                : val === 64
                ? 'bg-rose-600 text-white'
                : 'bg-yellow-400 text-slate-950 shadow-lg'
            }`}
          >
            {val > 0 ? val : ''}
          </div>
        ))}
      </div>

      {/* Touch D-Pad */}
      <div className="grid grid-cols-3 gap-1.5 w-36 sm:hidden pt-2">
        <div />
        <button onClick={() => move('up')} className="p-2 bg-slate-800 rounded-lg text-xs font-bold">
          ▲
        </button>
        <div />
        <button onClick={() => move('left')} className="p-2 bg-slate-800 rounded-lg text-xs font-bold">
          ◀
        </button>
        <button onClick={() => move('down')} className="p-2 bg-slate-800 rounded-lg text-xs font-bold">
          ▼
        </button>
        <button onClick={() => move('right')} className="p-2 bg-slate-800 rounded-lg text-xs font-bold">
          ▶
        </button>
      </div>
      <p className="text-[11px] text-slate-400 hidden sm:block">
        Use Arrow keys on your keyboard to slide tiles.
      </p>
    </div>
  );
};

// ================= Retro Snake Game =================
const SnakeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [runId, setRunId] = useState(0);
  const dirRef = useRef<{ dx: number; dy: number }>({ dx: 1, dy: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    let food = { x: 15, y: 15 };
    dirRef.current = { dx: 1, dy: 0 };
    let currentScore = 0;

    const gridSize = 20;
    const tileCount = 20;

    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
      }
      const { dx, dy } = dirRef.current;
      if (e.key === 'ArrowUp' && dy === 0) dirRef.current = { dx: 0, dy: -1 };
      if (e.key === 'ArrowDown' && dy === 0) dirRef.current = { dx: 0, dy: 1 };
      if (e.key === 'ArrowLeft' && dx === 0) dirRef.current = { dx: -1, dy: 0 };
      if (e.key === 'ArrowRight' && dx === 0) dirRef.current = { dx: 1, dy: 0 };
    };
    window.addEventListener('keydown', handleKey);

    const interval = setInterval(() => {
      const { dx, dy } = dirRef.current;
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        setGameOver(true);
        clearInterval(interval);
        return;
      }

      for (const segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
          setGameOver(true);
          clearInterval(interval);
          return;
        }
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        currentScore += 10;
        setScore(currentScore);
        food = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount),
        };
      } else {
        snake.pop();
      }

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(food.x * gridSize + 10, food.y * gridSize + 10, 8, 0, Math.PI * 2);
      ctx.fill();

      snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? '#38bdf8' : '#2563eb';
        ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    }, 110);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [runId]);

  return (
    <div className="flex flex-col items-center text-white space-y-3 p-2">
      <div className="flex items-center justify-between w-full max-w-[400px] text-xs">
        <span className="font-mono text-emerald-400 font-bold tabular-nums">Score: {score}</span>
        {gameOver && (
          <button
            onClick={() => {
              setGameOver(false);
              setScore(0);
              setRunId((r) => r + 1);
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 rounded-md font-bold text-xs"
          >
            Restart Snake
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="rounded-xl border border-slate-800 shadow-xl max-w-full"
      />
      <p className="text-[11px] text-slate-400">Use Arrow keys to steer your neon snake.</p>
    </div>
  );
};

// ================= Space Defender Playable Canvas Game =================
const SpaceDefenderGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let playerX = canvas.width / 2;
    const playerW = 34;
    const keys: Record<string, boolean> = {};
    let bullets: Array<{ x: number; y: number }> = [];
    let enemies: Array<{ x: number; y: number; alive: boolean }> = [];
    let enemyDir = 1;
    let currentWave = 1;
    let currentScore = 0;
    let cooldown = 0;
    let animId = 0;
    let isDead = false;

    const spawnWave = (w: number) => {
      enemies = [];
      const rows = Math.min(4, 2 + Math.floor(w / 2));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 7; c++) {
          enemies.push({ x: 45 + c * 46, y: 36 + r * 34, alive: true });
        }
      }
    };

    spawnWave(1);

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keys[e.key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = () => {
      if (isDead) return;

      if (keys['ArrowLeft'] || keys['a'] || keys['A']) playerX = Math.max(20, playerX - 5);
      if (keys['ArrowRight'] || keys['d'] || keys['D']) playerX = Math.min(canvas.width - 20, playerX + 5);
      if (keys[' '] && cooldown <= 0) {
        bullets.push({ x: playerX, y: canvas.height - 36 });
        cooldown = 12;
      }
      if (cooldown > 0) cooldown--;

      // Update bullets
      bullets = bullets.map((b) => ({ ...b, y: b.y - 7 })).filter((b) => b.y > 0);

      // Update enemies
      let hitEdge = false;
      const speed = 0.8 + currentWave * 0.25;
      for (const en of enemies) {
        if (!en.alive) continue;
        en.x += enemyDir * speed;
        if (en.x > canvas.width - 24 || en.x < 24) hitEdge = true;
      }
      if (hitEdge) {
        enemyDir *= -1;
        for (const en of enemies) {
          en.y += 16;
          if (en.alive && en.y >= canvas.height - 46) {
            isDead = true;
            setGameOver(true);
          }
        }
      }

      // Collisions
      for (const b of bullets) {
        for (const en of enemies) {
          if (en.alive && Math.abs(b.x - en.x) < 16 && Math.abs(b.y - en.y) < 14) {
            en.alive = false;
            b.y = -100;
            currentScore += 25;
            setScore(currentScore);
          }
        }
      }

      if (enemies.every((e) => !e.alive)) {
        currentWave++;
        setWave(currentWave);
        spawnWave(currentWave);
      }

      // Render
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Player ship
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(playerX, canvas.height - 34);
      ctx.lineTo(playerX - playerW / 2, canvas.height - 14);
      ctx.lineTo(playerX + playerW / 2, canvas.height - 14);
      ctx.closePath();
      ctx.fill();

      // Bullets
      ctx.fillStyle = '#f43f5e';
      for (const b of bullets) {
        ctx.fillRect(b.x - 2, b.y, 4, 10);
      }

      // Enemies
      for (const en of enemies) {
        if (!en.alive) continue;
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(en.x - 12, en.y - 10, 24, 18);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(en.x - 6, en.y - 4, 4, 4);
        ctx.fillRect(en.x + 2, en.y - 4, 4, 4);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [runId]);

  return (
    <div className="flex flex-col items-center text-white space-y-3 p-2">
      <div className="flex items-center justify-between w-full max-w-[420px] text-xs">
        <span className="font-mono text-sky-400 font-bold tabular-nums">Score: {score}</span>
        <span className="font-mono text-amber-400 font-bold tabular-nums">Wave: {wave}</span>
        {gameOver && (
          <button
            onClick={() => {
              setGameOver(false);
              setScore(0);
              setWave(1);
              setRunId((r) => r + 1);
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 rounded-md font-bold text-xs"
          >
            Play Again
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={420}
        height={380}
        className="rounded-xl border border-slate-800 shadow-xl max-w-full"
      />
      <p className="text-[11px] text-slate-400">
        Move with Left/Right Arrows (or A/D) · Press Spacebar to fire.
      </p>
    </div>
  );
};

// ================= Neon Pong Playable Canvas Game =================
const PongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let playerY = canvas.height / 2 - 35;
    let aiY = canvas.height / 2 - 35;
    const paddleH = 70;
    let ball = { x: canvas.width / 2, y: canvas.height / 2, vx: 4, vy: 3 };
    let pScore = 0;
    let aScore = 0;
    let animId = 0;
    let finished = false;
    const keys: Record<string, boolean> = {};

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      keys[e.key] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      playerY = Math.max(0, Math.min(canvas.height - paddleH, e.clientY - rect.top - paddleH / 2));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousemove', onMouseMove);

    const resetBall = (dir: number) => {
      ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: 4 * dir,
        vy: (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random() * 2),
      };
    };

    const loop = () => {
      if (finished) return;

      if (keys['ArrowUp'] || keys['w'] || keys['W']) playerY = Math.max(0, playerY - 6);
      if (keys['ArrowDown'] || keys['s'] || keys['S']) playerY = Math.min(canvas.height - paddleH, playerY + 6);

      // AI paddle
      const aiCenter = aiY + paddleH / 2;
      if (aiCenter < ball.y - 10) aiY = Math.min(canvas.height - paddleH, aiY + 3.6);
      else if (aiCenter > ball.y + 10) aiY = Math.max(0, aiY - 3.6);

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.y <= 8 || ball.y >= canvas.height - 8) ball.vy *= -1;

      // Player paddle hit
      if (ball.x <= 24 && ball.x >= 12 && ball.y >= playerY && ball.y <= playerY + paddleH) {
        ball.vx = Math.abs(ball.vx) * 1.04;
        ball.vy += ((ball.y - (playerY + paddleH / 2)) / paddleH) * 4;
      }

      // AI paddle hit
      if (ball.x >= canvas.width - 24 && ball.x <= canvas.width - 12 && ball.y >= aiY && ball.y <= aiY + paddleH) {
        ball.vx = -Math.abs(ball.vx) * 1.04;
        ball.vy += ((ball.y - (aiY + paddleH / 2)) / paddleH) * 4;
      }

      if (ball.x < 0) {
        aScore++;
        setScores({ player: pScore, ai: aScore });
        if (aScore >= 7) {
          finished = true;
          setWinner('AI');
        } else {
          resetBall(1);
        }
      } else if (ball.x > canvas.width) {
        pScore++;
        setScores({ player: pScore, ai: aScore });
        if (pScore >= 7) {
          finished = true;
          setWinner('You');
        } else {
          resetBall(-1);
        }
      }

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center line
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Paddles
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(12, playerY, 10, paddleH);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(canvas.width - 22, aiY, 10, paddleH);

      // Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [runId]);

  return (
    <div className="flex flex-col items-center text-white space-y-3 p-2">
      <div className="flex items-center justify-between w-full max-w-[460px] text-xs font-mono">
        <span className="text-sky-400 font-bold tabular-nums">You: {scores.player}</span>
        {winner ? (
          <button
            onClick={() => {
              setWinner(null);
              setScores({ player: 0, ai: 0 });
              setRunId((r) => r + 1);
            }}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 rounded-md font-bold text-xs"
          >
            {winner} Won! Rematch
          </button>
        ) : (
          <span className="text-slate-400">First to 7</span>
        )}
        <span className="text-rose-400 font-bold tabular-nums">AI: {scores.ai}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={460}
        height={340}
        className="rounded-xl border border-slate-800 shadow-xl max-w-full cursor-none"
      />
      <p className="text-[11px] text-slate-400">
        Move your mouse over the arena or use W/S / Up/Down arrows.
      </p>
    </div>
  );
};

// ================= Memory Matrix Playable Puzzle =================
const MemoryMatrixGame: React.FC = () => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userIndex, setUserIndex] = useState(0);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'failed'>('idle');

  const playSequence = useCallback((seq: number[]) => {
    setPhase('showing');
    setUserIndex(0);
    seq.forEach((tile, idx) => {
      setTimeout(() => setActiveTile(tile), idx * 550 + 250);
      setTimeout(() => setActiveTile(null), idx * 550 + 620);
    });
    setTimeout(() => {
      setPhase('input');
    }, seq.length * 550 + 300);
  }, []);

  const startLevel = (lvl: number) => {
    const length = lvl + 2;
    const seq = Array.from({ length }, () => Math.floor(Math.random() * 16));
    setSequence(seq);
    setLevel(lvl);
    playSequence(seq);
  };

  const handleTileClick = (idx: number) => {
    if (phase !== 'input') return;
    setActiveTile(idx);
    setTimeout(() => setActiveTile(null), 180);

    if (sequence[userIndex] === idx) {
      if (userIndex + 1 === sequence.length) {
        const nextLevel = level + 1;
        setPhase('showing');
        setTimeout(() => startLevel(nextLevel), 500);
      } else {
        setUserIndex((i) => i + 1);
      }
    } else {
      setPhase('failed');
    }
  };

  return (
    <div className="p-4 flex flex-col items-center text-white space-y-4 select-none">
      <div className="flex items-center justify-between w-64 text-xs">
        <span className="font-mono text-amber-400 font-bold tabular-nums">Level: {level}</span>
        <span className="text-slate-400">
          {phase === 'idle' && 'Press Start'}
          {phase === 'showing' && 'Watch pattern...'}
          {phase === 'input' && `Repeat (${userIndex}/${sequence.length})`}
          {phase === 'failed' && 'Wrong tile!'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 w-64 h-64 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        {Array.from({ length: 16 }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleTileClick(idx)}
            disabled={phase !== 'input'}
            className={`rounded-xl transition-all duration-150 ${
              activeTile === idx
                ? 'bg-amber-400 scale-95 shadow-lg shadow-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {(phase === 'idle' || phase === 'failed') && (
        <button
          onClick={() => startLevel(1)}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          {phase === 'failed' ? 'Retry from Level 1' : 'Start Level 1'}
        </button>
      )}
    </div>
  );
};
