-- Server/db/migrations/006_add_location_fields_to_job_offers.sql

ALTER TABLE job_offers
  ADD COLUMN IF NOT EXISTS city VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS municipality VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS village VARCHAR(120) NULL;

-- (Opcional) indexes si piensas filtrar por ubicación:
CREATE INDEX IF NOT EXISTS idx_job_offers_city ON job_offers(city);
CREATE INDEX IF NOT EXISTS idx_job_offers_municipality ON job_offers(municipality);
