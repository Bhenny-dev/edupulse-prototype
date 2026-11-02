-- Official student identity is maintained by provisioning, separately from course enrollment.
CREATE TABLE public.edupulse_students (
 student_number text PRIMARY KEY CHECK (length(student_number) BETWEEN 1 AND 80),
 user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
 email text NOT NULL UNIQUE CHECK (email=lower(email) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
 surname text NOT NULL CHECK (length(surname) BETWEEN 1 AND 100),
 first_name text NOT NULL CHECK (length(first_name) BETWEEN 1 AND 150),
 middle_name text NOT NULL DEFAULT '' CHECK (length(middle_name)<=100),
 full_name text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 350),
 year_level smallint NOT NULL CHECK (year_level BETWEEN 1 AND 4),
 department text NOT NULL CHECK (length(department) BETWEEN 1 AND 150),
 program text NOT NULL CHECK (length(program) BETWEEN 1 AND 250),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX edupulse_students_group_idx ON public.edupulse_students(department,program,year_level,surname,student_number) WHERE active;
ALTER TABLE public.edupulse_students ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edupulse_students FROM anon,authenticated;
GRANT SELECT ON public.edupulse_students TO authenticated;
GRANT ALL ON public.edupulse_students TO service_role;
CREATE POLICY edupulse_students_read ON public.edupulse_students FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()) OR (SELECT edupulse_private.academic_role()) IN ('instructor','dean','associate_dean','admin'));
