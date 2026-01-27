-- Migration: Add Opportunities Table
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('SCHOLARSHIP', 'COMPETITION', 'OLYMPIAD')) NOT NULL,
    organization TEXT NOT NULL,
    deadline DATE,
    reward TEXT,
    description TEXT,
    tags TEXT[],
    link TEXT,
    search_query TEXT,
    grade_level TEXT NOT NULL,
    region TEXT NOT NULL,
    interest TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster filtering and sorting
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_grade_region ON opportunities(grade_level, region, interest);
