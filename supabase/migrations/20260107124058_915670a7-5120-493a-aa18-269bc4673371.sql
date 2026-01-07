-- ============================================
-- Reading Compass Phase 2: Complete Database Schema
-- ============================================

-- 1. ASSESSMENTS TABLE
CREATE TABLE public.assessments (
  assessment_id TEXT PRIMARY KEY,
  component_code TEXT NOT NULL CHECK (component_code IN ('PA', 'PH', 'FL', 'VO', 'RC')),
  subcomponent_code TEXT NOT NULL,
  subcomponent_name TEXT NOT NULL,
  content_model TEXT NOT NULL CHECK (content_model IN ('universal', 'skill_based', 'grade_banded', 'grade_leveled')),
  grade_range TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'stub' CHECK (status IN ('stub', 'draft', 'active', 'deprecated')),
  current_asr_version_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ASR_VERSIONS TABLE
CREATE TABLE public.asr_versions (
  asr_version_id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  section_a JSONB DEFAULT '{}',
  section_b JSONB DEFAULT '{}',
  section_c JSONB DEFAULT '{}',
  section_d JSONB DEFAULT '{}',
  section_e JSONB DEFAULT '{}',
  section_f JSONB DEFAULT '{}',
  section_g JSONB DEFAULT '{}',
  section_h JSONB DEFAULT '{}',
  section_i JSONB DEFAULT '{}',
  section_j JSONB DEFAULT '{}',
  validation_status TEXT DEFAULT 'incomplete' CHECK (validation_status IN ('incomplete', 'valid', 'needs-review')),
  completeness_percent INTEGER DEFAULT 0,
  change_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONTENT_BANKS TABLE
CREATE TABLE public.content_banks (
  content_bank_id TEXT PRIMARY KEY,
  linked_assessment_id TEXT NOT NULL REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  differentiation_keys TEXT[] DEFAULT '{}',
  equivalence_set_required BOOLEAN DEFAULT FALSE,
  target_bank_size INTEGER DEFAULT 0,
  current_size INTEGER DEFAULT 0,
  status TEXT DEFAULT 'empty' CHECK (status IN ('empty', 'in-progress', 'ready')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSESSMENT_BANKS JOIN TABLE
CREATE TABLE public.assessment_banks (
  assessment_id TEXT NOT NULL REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  content_bank_id TEXT NOT NULL REFERENCES public.content_banks(content_bank_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (assessment_id, content_bank_id)
);

-- 5. FORMS TABLE
CREATE TABLE public.forms (
  form_id TEXT PRIMARY KEY,
  content_bank_id TEXT NOT NULL REFERENCES public.content_banks(content_bank_id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  grade_or_level_tag TEXT NOT NULL,
  form_number INTEGER NOT NULL,
  equivalence_set_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (assessment_id, grade_or_level_tag, form_number)
);

-- 6. ITEMS TABLE
CREATE TABLE public.items (
  item_id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES public.forms(form_id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('letter', 'word', 'sentence', 'passage', 'question', 'prompt')),
  sequence_number INTEGER NOT NULL,
  content_payload JSONB NOT NULL,
  scoring_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (form_id, sequence_number)
);

-- 7. SCORING_OUTPUTS TABLE
CREATE TABLE public.scoring_outputs (
  scoring_model_id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES public.assessments(assessment_id) ON DELETE CASCADE,
  raw_metrics_schema JSONB DEFAULT '[]',
  derived_metrics_schema JSONB DEFAULT '[]',
  formulas JSONB DEFAULT '[]',
  flags JSONB DEFAULT '[]',
  thresholds JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_asr_versions_assessment_id ON public.asr_versions(assessment_id);
CREATE INDEX idx_content_banks_linked_assessment_id ON public.content_banks(linked_assessment_id);
CREATE INDEX idx_assessment_banks_assessment_id ON public.assessment_banks(assessment_id);
CREATE INDEX idx_assessment_banks_content_bank_id ON public.assessment_banks(content_bank_id);
CREATE INDEX idx_forms_assessment_id ON public.forms(assessment_id);
CREATE INDEX idx_forms_content_bank_id ON public.forms(content_bank_id);
CREATE INDEX idx_items_form_id ON public.items(form_id);
CREATE INDEX idx_scoring_outputs_assessment_id ON public.scoring_outputs(assessment_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- APPLY TRIGGERS TO ALL TABLES
-- ============================================
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asr_versions_updated_at
  BEFORE UPDATE ON public.asr_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_banks_updated_at
  BEFORE UPDATE ON public.content_banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scoring_outputs_updated_at
  BEFORE UPDATE ON public.scoring_outputs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asr_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_outputs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: ASSESSMENTS
-- ============================================
CREATE POLICY "Authenticated users can read assessments"
  ON public.assessments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assessments"
  ON public.assessments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update assessments"
  ON public.assessments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assessments"
  ON public.assessments FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS POLICIES: ASR_VERSIONS
-- ============================================
CREATE POLICY "Authenticated users can read asr_versions"
  ON public.asr_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert asr_versions"
  ON public.asr_versions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update asr_versions"
  ON public.asr_versions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete asr_versions"
  ON public.asr_versions FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS POLICIES: CONTENT_BANKS
-- ============================================
CREATE POLICY "Authenticated users can read content_banks"
  ON public.content_banks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert content_banks"
  ON public.content_banks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update content_banks"
  ON public.content_banks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete content_banks"
  ON public.content_banks FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS POLICIES: ASSESSMENT_BANKS
-- ============================================
CREATE POLICY "Authenticated users can read assessment_banks"
  ON public.assessment_banks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert assessment_banks"
  ON public.assessment_banks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update assessment_banks"
  ON public.assessment_banks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assessment_banks"
  ON public.assessment_banks FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS POLICIES: FORMS
-- ============================================
CREATE POLICY "Authenticated users can read forms"
  ON public.forms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert forms"
  ON public.forms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update forms"
  ON public.forms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete forms"
  ON public.forms FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS POLICIES: ITEMS
-- ============================================
CREATE POLICY "Authenticated users can read items"
  ON public.items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert items"
  ON public.items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update items"
  ON public.items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete items"
  ON public.items FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS POLICIES: SCORING_OUTPUTS
-- ============================================
CREATE POLICY "Authenticated users can read scoring_outputs"
  ON public.scoring_outputs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert scoring_outputs"
  ON public.scoring_outputs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update scoring_outputs"
  ON public.scoring_outputs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete scoring_outputs"
  ON public.scoring_outputs FOR DELETE TO authenticated USING (true);