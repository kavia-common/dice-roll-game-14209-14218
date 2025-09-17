import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

/**
 * Ocean Professional Dice Game
 * - Centered dice with Roll button
 * - Result panel beneath
 * - History on the right (latest first)
 * - Responsive: history collapses below on mobile
 * - Modern minimalist styling with blue and amber accents
 */

// Utility to generate a fair random integer between min and max inclusive
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// PUBLIC_INTERFACE
export default function App() {
  const [theme, setTheme] = useState('light');
  const [current, setCurrent] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState([]);
  const mounted = useRef(false);

  // Apply theme attribute for CSS custom properties
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Hydrate from localStorage (history and theme) for persistence
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    try {
      const saved = JSON.parse(localStorage.getItem('dice-history') || '[]');
      if (Array.isArray(saved)) setHistory(saved);
    } catch {
      // ignore parse errors
    }
    try {
      const savedTheme = localStorage.getItem('dice-theme');
      if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('dice-history', JSON.stringify(history));
    } catch {
      // ignore storage errors
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem('dice-theme', theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const lastOutcome = history[0];

  // PUBLIC_INTERFACE
  const rollDice = useCallback(() => {
    if (rolling) return;
    setRolling(true);

    // Small animation: change face several times before finalizing
    const frames = 10;
    const intervalMs = 60;
    let i = 0;
    const timer = setInterval(() => {
      setCurrent(randomInt(1, 6));
      i += 1;
      if (i >= frames) {
        clearInterval(timer);
        const final = randomInt(1, 6);
        setCurrent(final);
        const stamp = new Date().toISOString();
        setHistory(prev => [{ value: final, at: stamp, id: `${stamp}-${final}-${prev.length}` }, ...prev].slice(0, 50));
        setRolling(false);
      }
    }, intervalMs);
  }, [rolling]);

  const stats = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    history.forEach(h => { counts[h.value] += 1; });
    const total = history.length || 1;
    const perc = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Math.round((v / total) * 100)]));
    return { counts, total: history.length, perc };
  }, [history]);

  return (
    <div className="app-root">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <main className="layout">
        <section className="stage-card">
          <Dice face={current} rolling={rolling} />
          <div className="controls">
            <button
              className="btn-primary"
              onClick={rollDice}
              disabled={rolling}
              aria-live="polite"
              aria-busy={rolling}
            >
              {rolling ? 'Rolling…' : 'Roll'}
            </button>
          </div>
          <ResultPanel outcome={lastOutcome} />
          <DistributionBar stats={stats} />
        </section>
        <aside className="history-card" aria-label="Roll history">
          <HistoryList items={history} />
        </aside>
      </main>
      <footer className="footer-note">
        Built with Ocean Professional theme
      </footer>
    </div>
  );
}

// PUBLIC_INTERFACE
function TopBar({ theme, onToggleTheme }) {
  /** Minimal top bar with theme toggle */
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-logo" aria-hidden>🎲</span>
        <span className="brand-title">Dice Roller</span>
      </div>
      <button
        className="btn-ghost"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </header>
  );
}

// PUBLIC_INTERFACE
function Dice({ face, rolling }) {
  /**
   * Accessible dice display. Uses pips rendered via CSS grid.
   * Adds a subtle wobble when rolling.
   */
  const pips = getPipMap(face);
  return (
    <div className={`dice ${rolling ? 'wobble' : ''}`} role="img" aria-label={`Dice showing ${face}`}>
      {Array.from({ length: 9 }).map((_, idx) => (
        <span key={idx} className={`pip ${pips.has(idx) ? 'on' : ''}`} />
      ))}
    </div>
  );
}

// PUBLIC_INTERFACE
function ResultPanel({ outcome }) {
  /**
   * Shows the latest outcome with subtle accent styling.
   */
  if (!outcome) {
    return (
      <div className="result-panel muted">
        Roll the dice to begin
      </div>
    );
  }
  return (
    <div className="result-panel">
      <div className="result-title">Latest Result</div>
      <div className="result-value">
        {outcome.value}
      </div>
      <div className="result-time">
        {new Date(outcome.at).toLocaleString()}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function HistoryList({ items }) {
  /**
   * Displays roll history (latest first).
   */
  if (!items.length) {
    return (
      <div className="history-empty">
        No rolls yet.
      </div>
    );
  }
  return (
    <ul className="history-list">
      {items.map(item => (
        <li key={item.id} className="history-item">
          <span className="badge">{item.value}</span>
          <span className="timestamp">{new Date(item.at).toLocaleTimeString()}</span>
        </li>
      ))}
    </ul>
  );
}

// PUBLIC_INTERFACE
function DistributionBar({ stats }) {
  /**
   * Tiny frequency distribution to hint at fairness.
   */
  const faces = [1, 2, 3, 4, 5, 6];
  return (
    <div className="dist">
      {faces.map(f => (
        <div key={f} className="dist-item">
          <div className="dist-label">{f}</div>
          <div className="dist-bar">
            <div
              className="dist-fill"
              style={{ width: `${Math.max(stats.perc[f], 4)}%` }}
              aria-label={`Face ${f}: ${stats.counts[f]} times (${stats.perc[f]}%)`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Returns a set of pip positions (0..8) to activate for a given face.
 * Grid positions:
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */
function getPipMap(face) {
  switch (face) {
    case 1: return new Set([4]);
    case 2: return new Set([0, 8]);
    case 3: return new Set([0, 4, 8]);
    case 4: return new Set([0, 2, 6, 8]);
    case 5: return new Set([0, 2, 4, 6, 8]);
    case 6: return new Set([0, 2, 3, 5, 6, 8]);
    default: return new Set([4]);
  }
}
