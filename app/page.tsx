"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { isFinished, isWon, MAX_ATTEMPTS, readHistory, shareText, statistics, type Game, type History, type Puzzle } from "../lib/game";

const STORAGE_KEY = "daily-number:history:v1";
const HELP_KEY = "daily-number:instructions:v1";

export default function Home() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [history, setHistory] = useState<History>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [manualShare, setManualShare] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const timeOffset = useRef(0);
  const refreshing = useRef(false);
  const lastRefresh = useRef(0);
  const sending = useRef(false);
  const historyRef = useRef<History>({});
  const puzzleRef = useRef<Puzzle | null>(null);
  const field = useRef<HTMLInputElement>(null);

  function acceptPuzzle(next: Puzzle) {
    timeOffset.current = Date.parse(next.serverTime) - Date.now();
    puzzleRef.current = next;
    setPuzzle(next);
    setSeconds(Math.max(0, Math.ceil((Date.parse(next.resetsAt) - Date.now() - timeOffset.current) / 1000)));
  }

  const loadPuzzle = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    lastRefresh.current = Date.now();
    try {
      const response = await fetch("/api/puzzle", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const next: Puzzle = await response.json();
      if (puzzleRef.current && next.id !== puzzleRef.current.id) {
        setInput(""); setNotice("A new day, a new number. Your next puzzle is ready.");
      }
      acceptPuzzle(next);
      setError("");
    } catch { setError("We couldn’t load today’s puzzle. Check your connection and try again."); }
    finally { refreshing.current = false; }
  }, []);

  useEffect(() => {
    try {
      historyRef.current = readHistory(localStorage.getItem(STORAGE_KEY));
      setHistory(historyRef.current);
      if (!localStorage.getItem(HELP_KEY)) dialog.current?.showModal();
    } catch { setStorageWarning("Saved progress could not be loaded. Progress may not survive closing this page."); }
    setCanShare(typeof navigator.share === "function");
    void loadPuzzle();
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try { historyRef.current = readHistory(event.newValue); setHistory(historyRef.current); }
      catch { setStorageWarning("Saved progress could not be read from another tab."); }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void loadPuzzle(); };
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => {
      const current = puzzleRef.current;
      if (!current) return;
      const remaining = Math.max(0, Math.ceil((Date.parse(current.resetsAt) - Date.now() - timeOffset.current) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && !refreshing.current && Date.now() - lastRefresh.current > 10000) void loadPuzzle();
    }, 1000);
    return () => { clearInterval(timer); window.removeEventListener("storage", sync); document.removeEventListener("visibilitychange", onVisible); };
  }, [loadPuzzle]);

  const game: Game = puzzle ? history[puzzle.id] ?? { id: puzzle.id, attempts: [] } : { id: "", attempts: [] };
  const finished = isFinished(game);
  const won = isWon(game);
  const stats = statistics(history, puzzle?.id ?? "2000-01-01");
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, "0")).join(":");
  const lower = Math.max(1, ...game.attempts.filter(a => a.feedback === "higher").map(a => a.value + 1));
  const upper = Math.min(50, ...game.attempts.filter(a => a.feedback === "lower").map(a => a.value - 1));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!puzzle || finished || sending.current || seconds === 0) return;
    setError(""); setNotice("");
    const value = Number(input);
    if (!/^\d+$/.test(input.trim()) || !Number.isInteger(value) || value < 1 || value > 50) {
      setError("Enter a whole number from 1 to 50."); return;
    }
    const current = historyRef.current[puzzle.id] ?? game;
    if (isFinished(current)) return;
    if (current.attempts.some(a => a.value === value)) { setError("You’ve already tried that number. Pick another."); return; }
    sending.current = true; setBusy(true);
    try {
      const response = await fetch("/api/guess", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: puzzle.id, guesses: [...current.attempts.map(a => a.value), value] })
      });
      const result = await response.json();
      if (response.status === 409) { acceptPuzzle(result.puzzle); setInput(""); setNotice(result.error); return; }
      if (!response.ok) throw new Error(result.error);
      acceptPuzzle(result.puzzle);
      // Preserve longer progress if another tab advanced during this request.
      const existing = historyRef.current[result.game.id];
      if (!existing || (!isFinished(existing) && existing.attempts.length < result.game.attempts.length)) {
        const next = { ...historyRef.current, [result.game.id]: result.game };
        historyRef.current = next; setHistory(next);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
        catch { setStorageWarning("Your browser couldn’t save this game. Keep this page open to retain your progress."); }
      }
      setInput("");
      const latest = result.game.attempts.at(-1);
      setNotice(latest.feedback === "correct" ? "You found today’s number!" : `Try a ${latest.feedback} number.`);
    } catch (err) { setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Couldn’t send your guess. Check your connection and try again. Your attempt hasn’t been used."); }
    finally { sending.current = false; setBusy(false); field.current?.focus(); }
  }

  function resultText() { return `${shareText(game)}\n${window.location.origin}`; }
  async function copyResult() {
    const text = resultText();
    try { await navigator.clipboard.writeText(text); setNotice("Result copied. Share it wherever you like."); }
    catch { setManualShare(text); setNotice("Select and copy your result below."); }
  }
  async function shareResult() {
    try { await navigator.share({ text: resultText() }); }
    catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) await copyResult(); }
  }
  function closeHelp() {
    dialog.current?.close();
    try { localStorage.setItem(HELP_KEY, "seen"); } catch { /* Help remains available without storage. */ }
  }

  return (
    <main className="shell">
      <header className="header">
        <a className="wordmark" href="/" aria-label="Daily Number home"><span className="logo" aria-hidden="true">№</span> daily number<span className="brand-dot">.</span></a>
        <button className="help-button" onClick={() => dialog.current?.showModal()} aria-label="How to play">?</button>
      </header>

      <section className="game" aria-labelledby="game-title">
        <div className="edition"><span className="live-dot" /> DAILY PUZZLE <span className="edition-date">{puzzle?.id ?? "TODAY"}</span></div>
        <h1 id="game-title">A little guesswork.</h1>
        <p className="intro">One number between <strong>1 and 50.</strong><br />Five chances to find it.</p>

        <div className="play-card">
          <div className="card-heading"><span>{finished ? "TODAY’S NUMBER" : "THE NUMBER IS…"}</span><span className="attempt-count">{game.attempts.length} / {MAX_ATTEMPTS} guesses</span></div>
          <div className={`mystery ${won ? "solved" : ""}`}>{finished ? game.answer ?? game.attempts.find(a => a.feedback === "correct")?.value ?? "—" : "?"}</div>
          <p className="range-hint">{finished ? won ? "Nicely found." : "A fresh start tomorrow." : game.attempts.length ? `Narrowed down to ${lower}–${upper}` : "Start anywhere. Follow the clues."}</p>

          <ol className="attempts" aria-label="Your guesses">
            {Array.from({ length: MAX_ATTEMPTS }, (_, index) => {
              const attempt = game.attempts[index];
              return <li key={index} className={`attempt ${attempt ? `filled ${attempt.feedback}` : "empty"}`}>
                <span className="attempt-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="attempt-value">{attempt?.value ?? "—"}</span>
                <span className="attempt-clue">{attempt ? attempt.feedback === "correct" ? "Found it ✓" : attempt.feedback === "higher" ? "Go higher ↑" : "Go lower ↓" : index === game.attempts.length && !finished ? "Your next guess" : ""}</span>
              </li>;
            })}
          </ol>

          {!finished ? <form onSubmit={submit} className="guess-form" noValidate>
            <label htmlFor="guess">Your guess</label>
            <div className="input-row"><input ref={field} id="guess" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={2} placeholder="1–50" value={input} onChange={event => setInput(event.target.value)} disabled={!puzzle || busy || seconds === 0} aria-describedby={error ? "game-error" : undefined} /><button className="primary" type="submit" disabled={!puzzle || busy || !input || seconds === 0}>{busy ? "Checking…" : "Guess →"}</button></div>
          </form> : <div className="result">
            <h2>{won ? `Solved in ${game.attempts.length} ${game.attempts.length === 1 ? "guess" : "guesses"}` : "That’s five. See you tomorrow!"}</h2>
            <p className="share-marks" aria-label="Spoiler-free result">{game.attempts.map(a => a.feedback === "correct" ? "💠" : "🫧").join("")}</p>
            <div className="share-actions"><button className="primary" onClick={copyResult}>Copy result</button>{canShare && <button className="secondary" onClick={shareResult}>Share…</button>}</div>
            {manualShare && <label className="manual-share">Copy this result<textarea readOnly value={manualShare} onFocus={event => event.target.select()} /></label>}
          </div>}
          {error && <p className="error" id="game-error" role="alert">{error} {!puzzle && <button className="text-button" onClick={loadPuzzle}>Try again</button>}</p>}
          <p className="notice" role="status">{notice}</p>
        </div>

        <section className="stats" aria-label="Your statistics">
          <div><strong>{stats.played}</strong><span>Played</span></div><div><strong>{stats.wins}</strong><span>Wins</span></div><div><strong>{stats.streak}<span className="streak-unit"> days</span></strong><span>Play streak</span></div>
        </section>
        {storageWarning && <p className="storage-warning" role="status">{storageWarning}</p>}
        <footer className="footer"><p>Next number in <strong>{puzzle ? countdown : "—"}</strong></p><span>Midnight Eastern · Same puzzle for everyone</span><span className="local-note">Progress saved in this browser.</span></footer>
      </section>

      <dialog ref={dialog} className="help-dialog" onCancel={closeHelp} onClick={event => { if (event.target === event.currentTarget) closeHelp(); }}>
        <div className="modal-heading"><span className="eyebrow">THE DAILY RITUAL</span><button className="help-button" onClick={closeHelp} aria-label="Close instructions">×</button></div>
        <h2>How to play</h2>
        <p>Find the number from <strong>1 to 50</strong> in <strong>five guesses.</strong></p>
        <div className="example"><strong>25</strong><span>Go higher ↑</span></div><p className="example-caption">The answer is greater than 25. Try a higher number next.</p>
        <ul><li>Every guess tells you to go higher or lower—or that you found it.</li><li>Everyone gets the same puzzle, changing at midnight Eastern.</li><li>Make one guess to count toward your daily play streak. Winning is optional.</li><li>Come back before the reset to finish. Your progress stays in this browser.</li><li>After five guesses or a win, share your spoiler-free result.</li></ul>
        <button className="primary modal-start" onClick={closeHelp}>Let’s play</button>
      </dialog>
    </main>
  );
}
