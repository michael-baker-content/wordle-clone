-- Player IDs are anonymous. No email, IP address, or future deck is stored here.
CREATE TABLE IF NOT EXISTS jacklet_runs (
  environment text NOT NULL,
  generation text NOT NULL,
  player_id uuid NOT NULL,
  puzzle_date date NOT NULL,
  rules_version text NOT NULL,
  moves jsonb NOT NULL CHECK (jsonb_typeof(moves) = 'array'),
  revision integer NOT NULL CHECK (revision BETWEEN 1 AND 104),
  score integer NOT NULL,
  stars smallint NOT NULL CHECK (stars BETWEEN 0 AND 5),
  hands_played smallint NOT NULL CHECK (hands_played BETWEEN 1 AND 13),
  hands_won smallint NOT NULL CHECK (hands_won BETWEEN 0 AND hands_played),
  strikes smallint NOT NULL CHECK (strikes BETWEEN 0 AND 3),
  jokers_bought smallint NOT NULL CHECK (jokers_bought >= 0),
  cards_revealed smallint NOT NULL CHECK (cards_revealed BETWEEN 0 AND 52),
  phase text NOT NULL CHECK (phase IN ('player', 'between', 'lost', 'cleared')),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (environment, generation, player_id, puzzle_date),
  CHECK (jsonb_array_length(moves) = revision),
  CHECK ((phase IN ('lost', 'cleared')) = (completed_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS jacklet_runs_daily_results
  ON jacklet_runs (environment, generation, puzzle_date, score)
  WHERE completed_at IS NOT NULL;
