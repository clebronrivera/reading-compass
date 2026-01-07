-- Create sessions table
CREATE TABLE public.sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT NOT NULL REFERENCES public.assessments(assessment_id),
  form_id TEXT NOT NULL REFERENCES public.forms(form_id),
  student_name TEXT NOT NULL,
  grade_tag TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  current_item_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for sessions
CREATE POLICY "Authenticated users can read sessions" ON public.sessions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sessions" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sessions" ON public.sessions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete sessions" ON public.sessions
  FOR DELETE TO authenticated USING (true);

-- Create session_responses table
CREATE TABLE public.session_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(session_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.items(item_id),
  sequence_number INTEGER NOT NULL,
  is_correct BOOLEAN,
  error_tags TEXT[] DEFAULT '{}',
  response_time_ms INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, item_id)
);

-- Enable RLS on session_responses
ALTER TABLE public.session_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_responses
CREATE POLICY "Authenticated users can read session_responses" ON public.session_responses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert session_responses" ON public.session_responses
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update session_responses" ON public.session_responses
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete session_responses" ON public.session_responses
  FOR DELETE TO authenticated USING (true);