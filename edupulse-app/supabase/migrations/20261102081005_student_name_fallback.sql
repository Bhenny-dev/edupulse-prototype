-- Retain an absent official surname rather than inventing one for an approved password fallback.
ALTER TABLE public.edupulse_students DROP CONSTRAINT edupulse_students_surname_check;
ALTER TABLE public.edupulse_students ADD CONSTRAINT edupulse_students_surname_check CHECK (length(surname)<=100);
