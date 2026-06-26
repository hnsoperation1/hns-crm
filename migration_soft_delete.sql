-- Soft delete: thêm deleted_at vào 4 bảng chính
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE contacts      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE care_cards    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index để query active records nhanh
CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON organizations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_deleted      ON contacts(deleted_at)      WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_deleted ON opportunities(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_care_cards_deleted    ON care_cards(deleted_at)    WHERE deleted_at IS NULL;
