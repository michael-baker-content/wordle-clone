"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import AnimatedScore from "./animated-score";
import CardTable from "./card-table";
import { cardName, RANKS, type Action } from "../lib/blackjack/engine.mjs";
import { HELP_KEY, STORAGE_KEY, isFinished, readHistory, shareText, detailedShareText, statistics, type Daily, type History } from "../lib/blackjack/client";

const SUITS = ["♣", "♦", "♥", "♠"];
export default function Home() {
  const [daily, setDaily] = useState<Daily | null>(null);
  const [history, setHistory] = useState<History>({});
  const [busy, setBusy] = useState(false);
  const [cardsAnimating, setCardsAnimating] = useState(false);
  const animationLock = useRef(false);
  const onCardsAnimating = useCallback((active: boolean) => { animationLock.current = active; setCardsAnimating(active); }, []);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [notice, setNotice] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [canShare, setCanShare] = useState(false);
  const [manual, setManual] = useState("");
  const help = useRef<HTMLDialogElement>(null);
  const current = useRef<Daily | null>(null);
  const saved = useRef<History>({});
  const offset = useRef(0);
  const working = useRef(false);
  const lastLoad = useRef(0);
  const accept = useCallback((next: Daily) => {
    if (current.current && current.current.id !== next.id) { setManual(""); setNotice("A fresh daily deck is ready."); }
    current.current = next;
    offset.current = Date.parse(next.serverTime) - Date.now();
    setDaily(next);
    setSeconds(Math.max(0, Math.ceil((Date.parse(next.resetsAt) - Date.now() - offset.current) / 1000)));
    if (next.run.revision > 0) {
      saved.current = { ...saved.current, [next.id]: next.run };
      setHistory(saved.current);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.current)); }
      catch { setWarning("Browser storage is unavailable. Keep this page open to retain your statistics."); }
    }
  }, []);
  const load = useCallback(async () => {
    if (working.current) return;
    working.current = true; lastLoad.current = Date.now(); setBusy(true);
    try {
      const response = await fetch("/api/blackjack", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      let next: Daily = data;
      const local = saved.current[next.id];
      if (local && local.revision > next.run.revision) {
        const resumed = await fetch("/api/blackjack", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({id:next.id,token:local.token,action:"resume"}) });
        const recovered = await resumed.json();
        if (!resumed.ok && resumed.status !== 409) throw new Error(recovered.error);
        next = recovered;
      }
      accept(next); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t load the daily deck. Try again."); }
    finally { working.current = false; setBusy(false); }
  }, [accept]);
  useEffect(() => {
    try { saved.current = readHistory(localStorage.getItem(STORAGE_KEY)); setHistory(saved.current); }
    catch { setWarning("Some saved statistics couldn’t be read. We’ll try to recover your current run from this browser’s cookie."); }
    try { if (!localStorage.getItem(HELP_KEY)) help.current?.showModal(); } catch { help.current?.showModal(); }
    setCanShare(typeof navigator.share === "function");
    void load();
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try { saved.current = readHistory(event.newValue); setHistory(saved.current); } catch { return; }
      void load();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("storage", sync);
    const timer = setInterval(() => {
      const d = current.current; if (!d) return;
      const left = Math.max(0, Math.ceil((Date.parse(d.resetsAt) - Date.now() - offset.current) / 1000));
      setSeconds(left);
      if (!left && Date.now() - lastLoad.current > 10000) void load();
    }, 1000);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange",visible); window.removeEventListener("storage",sync); };
  }, [load]);
  async function play(action: Action) {
    const d = current.current;
    if (!d || working.current || animationLock.current || seconds === 0 || isFinished(d.run)) return;
    working.current = true; setBusy(true); setPendingAction(action); setError(""); setNotice("");
    const send = async () => {
      const response = await fetch("/api/blackjack", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:d.id,token:d.run.token,action})});
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.error);
      accept(data);
      if (response.status === 409) setNotice("Your latest progress has been restored. Review the table before playing.");
    };
    try { if (navigator.locks) await navigator.locks.request("daily-blackjack-action",send); else await send(); }
    catch { setError("Couldn’t confirm that action. Use Recover run before trying again."); }
    finally { working.current = false; setBusy(false); setPendingAction(null); }
  }
  function closeHelp() { help.current?.close(); try { localStorage.setItem(HELP_KEY,"seen"); } catch {} }
  const run = daily?.run, done = !!run && isFinished(run);
  const dateParts = daily?.id.split("-");
  const month = dateParts ? ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."][Number(dateParts[1]) - 1] : "";
  const stats = statistics(history, daily?.id ?? "2000-01-01");
  const countdown = [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,"0")).join(":");
  async function copy(detailed = false) {
    if (!run || !done) return;
    const text = `${detailed ? detailedShareText(run) : shareText(run)}\n${window.location.origin}`;
    try { await navigator.clipboard.writeText(text); setNotice("Result copied."); }
    catch { setManual(text); setNotice("Select and copy your result below."); }
  }
  async function share() {
    if (!run || !done) return;
    try { await navigator.share({text:`${shareText(run)}\n${window.location.origin}`}); }
    catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) await copy(); }
  }
  return <main className="shell">
    <header className="header"><a className="wordmark" href="/"><span className="logo" aria-hidden="true">♠</span><span className="brand-name">Jacklet<small>daily blackjack</small></span></a><button className="help-button" aria-label="How to play" onClick={()=>help.current?.showModal()}>?</button></header>
    <div className="game">
      <h1 className="sr-only">Jacklet</h1>
      <div className="play-stage">
      <div className="title-row">
        <time className="daily-date" dateTime={daily?.id}>{dateParts ? <><span>{month} {dateParts[2]}</span><span>{dateParts[0]}</span></> : <span>Today</span>}</time>
        <div className="score" aria-label="Score">{run ? <AnimatedScore key={run.id} value={run.score} /> : <strong>0</strong>}<small>pts.</small></div>
      </div>
      <section className="table" aria-label="Blackjack table" aria-busy={busy || cardsAnimating}>
        {run && run.round > 0 && <><div className="table-top"><span>{run.round} played · {run.handsWon} won</span><span>Hand {run.round}</span></div><div className="hand-separator" aria-hidden="true" /></>}
        <CardTable table={{ id: run?.id ?? "loading", round: run?.round ?? 0, player: run?.player ?? [], dealer: run?.dealer ?? [] }} onAnimating={onCardsAnimating} />
        <div className="hand-separator message-separator" aria-hidden="true" />
        <p className="table-message" role="status">{busy ? "Loading…" : !run ? "Loading…" : cardsAnimating || run.phase === "ready" || run.phase === "player" ? "" : run.message}</p>
        {!done && <div className="table-actions">{run?.phase === "player" ? <><button className="primary" aria-busy={pendingAction === "hit"} disabled={busy || cardsAnimating || !seconds || !!error} onClick={()=>play("hit")}>Hit</button><button className="secondary" aria-busy={pendingAction === "stand"} disabled={busy || cardsAnimating || !seconds || !!error} onClick={()=>play("stand")}>Stand</button></> : <button className="primary" aria-busy={pendingAction === "deal"} disabled={!daily || busy || cardsAnimating || !seconds || !!error} onClick={()=>play("deal")}>{run?.phase === "between" ? "Next hand" : "Deal"}</button>}</div>}
      </section>
      </div>
      {error && <div className="error" role="alert">{error} <button className="text-button" onClick={load} disabled={busy}>Recover run</button></div>}
      {done && !cardsAnimating && run && <section className="result" aria-label="Daily result">
        <div className="result-scoring">
        <div className="score-treasure" aria-hidden="true">
          {["🪙", "💎", "💰", "🏆"].slice(0, Math.min(4, 2 + Math.floor(run.score / 100))).map((emoji, index) => <span key={index}>{emoji}</span>)}
        </div>
        <h2>{run.score} points</h2>
        <p className="run-summary">{run.round} hands played, {run.handsWon} won</p>
        <div className="stars" aria-label={`${run.stars} out of 5 stars`}>{"★".repeat(run.stars)}<span>{"☆".repeat(5-run.stars)}</span></div>
        </div>
        <div className="share-actions">
          <button className="primary" onClick={() => copy()}>Copy result</button>
          <button className="secondary" onClick={() => copy(true)}>Copy detailed result</button>
          {canShare && <button className="secondary" onClick={share}>Share…</button>}
        </div>
        {manual && <label className="manual-share">Copy your result<textarea readOnly value={manual} onFocus={e=>e.target.select()} /></label>}
      </section>}
      {run && run.revealed.length>0 && <details className="seen-cards"><summary>Revealed cards ({run.cardsTurned})</summary><div className="card-history">{run.revealed.map(c=><span key={c} className={[1,2].includes(Math.floor(c/13)) ? "red-card" : ""} aria-label={cardName(c)}>{RANKS[c%13]}{SUITS[Math.floor(c/13)]}</span>)}</div></details>}
      <p className="notice" role="status">{notice}</p>
      <section className="stats" aria-label="Your statistics"><div><strong>{stats.played}</strong><span>Played</span></div><div><strong>{stats.cleared}</strong><span>Decks cleared</span></div><div><strong>{stats.streak}<small> days</small></strong><span>Play streak</span></div></section>
      {warning && <p className="error" role="status">{warning}</p>}
      <footer className="footer"><p>Next deck in <strong>{daily ? countdown : "—"}</strong></p></footer>
    </div>
    <dialog className="help-dialog" ref={help} aria-labelledby="help-title" onCancel={closeHelp}>
      <div className="rules-heading"><h2 id="help-title">Jacklet rules</h2><button className="help-button" aria-label="Close rules" onClick={closeHelp}>×</button></div>
      <p className="rules-intro">One daily run. See how far you get.</p>
      <ul className="rules-list">
        <li><strong>Win or push</strong> to continue. A loss ends your run.</li>
        <li>Dealer stands on <strong>soft 17</strong> and checks blackjack. Naturals beat other 21s. No bets or splits.</li>
        <li><strong>100 points per win + 1 per revealed card.</strong> Dealer and losing cards count. Bust: reveal the hole card; no draws.</li>
        <li><strong>End of deck:</strong> {daily?.rulesVersion === "blackjack-v1" ? "flip the hole card and finish before settling the hand." : "score the last hand, even below dealer 17. Fewer than four left? End the run; leave them undealt."}</li>
        <li>Your final score earns <strong>1–5 stars</strong> for today’s challenge.</li>
      </ul>
      <p className="rules-footnote">Same deck daily. Resets midnight Eastern. Progress saves here. Start a hand to keep your streak.</p>
      <button className="primary modal-start" onClick={closeHelp}>Got it</button>
    </dialog>
  </main>;
}
