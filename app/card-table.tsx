"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cardName, JOKER, RANKS, total } from "../lib/blackjack/engine.mjs";
import { cardsPerRow } from "./card-layout";

type Table = { id: string; round: number; player: number[]; dealer: (number | null)[] };
type Presentation = { table: Table; exiting: boolean; playerFrom: number; dealerFrom: number; animate: boolean };
const SUITS = ["♣", "♦", "♥", "♠"];
const CLEAR_MS = 220;
const DEAL_MS = 350;
const STAGGER_MS = 90;

function Face({ value }: { value: number | null }) {
  const [failed, setFailed] = useState(false);
  if (value === JOKER) return <div className="card-art joker-art"><span className="joker-corner">Joker<small>1–11</small></span>{!failed && <img src="/cards/J-1.svg" width="72" height="101" alt="" onError={() => setFailed(true)} />}</div>;
  const suit = value === null ? 0 : Math.floor(value / 13);
  const rank = value === null ? "" : RANKS[value % 13];
  const file = value === null ? "B-1" : `${["C", "D", "H", "S"][suit]}-${rank}`;
  return <div className={`card-art ${value === null ? "card-art-back" : [1, 2].includes(suit) ? "red-card" : ""}`}>
    {value === null ? <span className="back-mark">♠</span> : <><span className="card-suit">{SUITS[suit]}</span><span className="corner bottom">{rank}<small>{SUITS[suit]}</small></span></>}
    {value !== null && <span className="readable-corner">{rank}<small>{SUITS[suit]}</small></span>}
    {!failed && <img src={`/cards/${file}.svg`} width="72" height="101" alt="" onError={() => setFailed(true)} />}
  </div>;
}

function Card({ value, entering, delay }: { value: number | null; entering: boolean; delay: number }) {
  return <div className={`card-slot${entering ? " card-entering" : ""}`} style={{ "--deal-delay": `${delay}ms` } as CSSProperties} role="img" aria-label={value === null ? "Face-down card" : cardName(value)}>
    <div className={`card-shell${value !== null ? " is-face-up" : ""}`} aria-hidden="true">
      <div className="card-rotator">
        <div className="card-side card-reverse"><Face value={null} /></div>
        <div className="card-side card-obverse">{value !== null && <Face key={value} value={value} />}</div>
      </div>
    </div>
  </div>;
}

function Hand({ title, cards, round, animate, from, delay, exiting }: { title: string; cards: (number | null)[]; round: string; animate: boolean; from: number; delay: number; exiting: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(6);
  const value = total(cards.filter((c): c is number => c !== null));
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setPerRow(cardsPerRow(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const rows = Array.from({ length: Math.ceil(cards.length / perRow) }, (_, row) => cards.slice(row * perRow, (row + 1) * perRow));
  return <section className="hand" aria-label={title}>
    <div className="hand-heading"><span>{title}</span>{cards.length > 0 && <span>{cards.includes(null) ? "Showing " : value.soft ? "Soft " : ""}{value.value}{value.value > 21 ? " · Bust" : ""}</span>}</div>
    <div ref={container} className={`hand-cards${exiting ? " hand-clearing" : ""}`}>
      {cards.length ? rows.map((row, rowIndex) => <div className="card-row" key={`${round}-${rowIndex}`}>
        {row.map((card, column) => {
          const index = rowIndex * perRow + column;
          return <Card key={`${round}-${index}`} value={card} entering={animate && index >= from} delay={delay + Math.max(0, index - from) * STAGGER_MS} />;
        })}
      </div>) : <div className="empty-hand"><div className="card-placeholder" /><div className="card-placeholder" /></div>}
    </div>
  </section>;
}

export default function CardTable({ table, onAnimating }: { table: Table; onAnimating: (value: boolean) => void }) {
  const [view, setView] = useState<Presentation>({ table, exiting: false, playerFrom: 0, dealerFrom: 0, animate: false });
  const displayed = useRef(table);
  const latest = useRef(table);
  latest.current = table;
  const fingerprint = JSON.stringify(table);

  useEffect(() => {
    const next = latest.current;
    const previous = displayed.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sameHand = previous.id === next.id && previous.round === next.round;
    const changed = JSON.stringify(previous) !== fingerprint;
    const settle = () => {
      timers.forEach(clearTimeout);
      displayed.current = next;
      setView({ table: next, exiting: false, playerFrom: 0, dealerFrom: 0, animate: false });
      onAnimating(false);
    };
    // Restoring a run is not a new deal. Reduced motion and background tabs snap.
    if (!changed || previous.id === "loading" || motion.matches || document.hidden) {
      settle();
      return;
    }
    const playerFrom = sameHand ? previous.player.length : 0;
    const dealerFrom = sameHand ? previous.dealer.length : 0;
    const added = Math.max(next.player.length - playerFrom, next.dealer.length - dealerFrom);
    const revealsHole = sameHand && previous.dealer.includes(null) && !next.dealer.includes(null);
    const dealerDelay = 240;
    const duration = Math.max(revealsHole ? 420 : 0, added ? DEAL_MS + dealerDelay + Math.max(0, added - 1) * STAGGER_MS : 0);
    const showNext = () => {
      displayed.current = next;
      setView({ table: next, exiting: false, playerFrom, dealerFrom, animate: true });
      timers.push(setTimeout(settle, duration));
    };
    onAnimating(true);
    if (!sameHand && previous.player.length + previous.dealer.length > 0) {
      setView(v => ({ ...v, exiting: true, animate: false }));
      timers.push(setTimeout(showNext, CLEAR_MS));
    } else showNext();
    const preferenceChanged = () => { if (motion.matches) settle(); };
    const visibilityChanged = () => { if (document.hidden) settle(); };
    motion.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      timers.forEach(clearTimeout);
      motion.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      onAnimating(false);
    };
  }, [fingerprint, onAnimating]);

  const round = `${view.table.id}-${view.table.round}`;
  return <>
    <Hand title="Dealer" cards={view.table.dealer} round={round} animate={view.animate} from={view.dealerFrom} delay={240} exiting={view.exiting} />
    <div className="hand-separator" aria-hidden="true" />
    <Hand title="Your hand" cards={view.table.player} round={round} animate={view.animate} from={view.playerFrom} delay={0} exiting={view.exiting} />
  </>;
}
