-- Server/db/migrations/005_create_job_offers.sql

-- Enums (opcionales pero útiles). Si no quieres enums, me dices y lo paso a TEXT.
DO $$ BEGIN
  CREATE TYPE work_type_enum AS ENUM ('recolectar_cafe', 'deshierbar', 'tecnico', 'otro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pay_period_enum AS ENUM ('por_hora', 'por_dia', 'por_semana', 'por_mes', 'por_contrato');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_status_enum AS ENUM ('draft', 'open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS job_offers (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,

  title VARCHAR(120) NOT NULL,
  work_type work_type_enum NOT NULL,

  people_needed INTEGER NOT NULL CHECK (people_needed > 0),

  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date >= start_date),

  hours_per_day NUMERIC(4,1) NOT NULL CHECK (hours_per_day > 0 AND hours_per_day <= 24),
  schedule_note TEXT NULL,

  pay_amount NUMERIC(12,2) NOT NULL CHECK (pay_amount > 0),
  pay_period pay_period_enum NOT NULL,

  accommodation_included BOOLEAN NOT NULL DEFAULT FALSE,
  transport_included BOOLEAN NOT NULL DEFAULT FALSE,

  food_included BOOLEAN NOT NULL DEFAULT FALSE,
  food_cost NUMERIC(12,2) NULL CHECK (food_cost IS NULL OR food_cost >= 0),

  extra_info TEXT NULL,
  status offer_status_enum NOT NULL DEFAULT 'open',

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_offers_farm_id ON job_offers(farm_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers(status);
