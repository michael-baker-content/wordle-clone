"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import CardTable from "../card-table";
import AnimatedScore from "../animated-score";
import { playSound, stopSound, unlockSound } from "../sound";
import { jokerPrice, type Action, type Phase } from "../../lib/blackjack/engine.mjs";
type View = {stars:number;id:string;player:number[];dealer:(number|null)[];phase:Phase;round:number;handsWon:number;strikes:number;jokersBought:number;score:number;cardsTurned:number;canPlayJoker:boolean;message:string};
const KEY = "jacklet:practice:three-strikes:v1";
const SOUND_KEY = KEY + ":sound";
export default function Practice() {
  const [dates,setDates] = useState<string[]>([]);
  const [id,setId] = useState("");
  const [run,setRun] = useState<View|null>(null);
  const [busy,setBusy] = useState(true);
  const [animating,setAnimating] = useState(false);
  const [error,setError] = useState("");
  const [scoreSession,setScoreSession] = useState(0);
  const [soundOn,setSoundOn] = useState(false);
  const soundEnabled = useRef(false);
  const moves = useRef<Action[]>([]);
  const locked = useRef(false);
  const onAnimating = useCallback((value:boolean)=>setAnimating(value),[]);
  async function replay(date:string, next:Action[], withSound = false) {
    if (locked.current) return;
    if (withSound && soundEnabled.current) unlockSound();
    locked.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/practice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:date,moves:next})});
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      if (!next.length) setScoreSession(session=>session+1);
      moves.current = next; setId(date); setRun(value);
      if (withSound && soundEnabled.current && run && run.id === date) {
        playSound(["lost","cleared"].includes(value.phase) ? value.stars >= 3 ? "result-good" : "result-bad" : value.strikes > run.strikes ? "lose" : value.handsWon > run.handsWon ? "win" : ["between","cleared"].includes(value.phase) ? "push" : "card");
      }
      try { sessionStorage.setItem(KEY,JSON.stringify({id:date,moves:next})); } catch {}
    } catch(err) { setError(err instanceof Error ? err.message : "Practice is unavailable."); }
    finally { locked.current = false; setBusy(false); }
  }
  useEffect(()=>{
    let cancelled = false;
    try {
      soundEnabled.current = sessionStorage.getItem(SOUND_KEY) === "on";
      setSoundOn(soundEnabled.current);
    } catch {}
    void (async()=>{
      try {
        const response = await fetch("/api/practice");
        if (!response.ok) throw new Error("Practice is available only with the local development server.");
        const {dates:available} = await response.json() as {dates:string[]};
        if (cancelled) return;
        setDates(available);
        const today = new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
        let selected = available.includes(today) ? today : available[0], history:Action[] = [];
        try {
          const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
          if (saved && available.includes(saved.id) && Array.isArray(saved.moves)) { selected=saved.id; history=saved.moves; }
        } catch {}
        setId(selected);
        await replay(selected,history);
      } catch(err) { if (!cancelled) {setError(err instanceof Error ? err.message : "Practice unavailable.");setBusy(false);} }
    })();
    return ()=>{cancelled=true;soundEnabled.current=false;stopSound();};
  },[]);
  function toggleSound() {
    const next = !soundEnabled.current;
    soundEnabled.current = next;
    setSoundOn(next);
    try { sessionStorage.setItem(SOUND_KEY,next ? "on" : "off"); } catch {}
    if (next) playSound("click"); else stopSound();
  }
  const done = run?.phase === "lost" || run?.phase === "cleared";
  return <main className="shell">
    <header className="header"><a className="wordmark" href="/">♠ Jacklet</a><div className="header-actions"><span>Local practice</span><button className={`sound-button ${soundOn ? "sound-on" : "sound-off"}`} aria-label={soundOn ? "Mute sounds" : "Enable sounds"} aria-pressed={soundOn} onClick={toggleSound}>♪</button></div></header>
    <div className="game practice">
      <h1>Three-strike playtest</h1>
      <p className="intro">Three losses end the run. Each costs 100 points. Wins never remove strikes. No scores or statistics are recorded.</p>
      <div className="practice-controls">
        <label>Deck date <select value={id} disabled={busy || animating} onChange={event=>void replay(event.target.value,[])}>{dates.map(date=><option key={date}>{date}</option>)}</select></label>
        <button className="secondary" disabled={busy || !id || animating} onClick={()=>void replay(id,[])}>Restart run</button>
      </div>
      {error && <p role="alert" className="error">{error} Use Restart run to begin again.</p>}

      {run && <>
        <div className="title-row"><span>{run.strikes} / 3 strikes</span><div className="score"><AnimatedScore key={run.id + ":" + scoreSession} value={run.score}/><small>pts.</small></div></div>
        <section className="table" aria-label="Practice blackjack table" aria-busy={busy || animating}>
          <div className="table-top"><span>{run.handsWon} won · {run.cardsTurned} cards</span><span>Hand {run.round}</span></div>
          <CardTable table={{id:run.id,round:run.round,player:run.player,dealer:run.dealer}} onAnimating={onAnimating}/>
          <p className="table-message" role="status">{animating ? "" : run.message}</p>
          {!done && <div className="table-actions">{(run.phase==="player" ? ["hit","stand"] as Action[] : ["deal"] as Action[]).map(action=><button key={action} className="primary" disabled={busy || animating} onClick={()=>void replay(id,[...moves.current,action],true)}>{action==="deal" ? run.round ? "Next hand" : "Deal" : action==="hit" ? "Hit" : "Stand"}</button>)}</div>}
          {run.phase==="player" && <button className="secondary joker-button" disabled={busy || animating || !run.canPlayJoker} onClick={()=>void replay(id,[...moves.current,"joker"],true)}>Play joker · {jokerPrice(run)} pts.</button>}
        </section>
        {done && !animating && <div className="stars" aria-label={`${run.stars} out of 5 stars`}>{"★".repeat(run.stars)}<span>{"☆".repeat(5-run.stars)}</span></div>}
      </>}
    </div>
  </main>;
}
