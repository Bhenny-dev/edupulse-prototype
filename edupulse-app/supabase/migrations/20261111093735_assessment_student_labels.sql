-- Timed assessment submissions omitted the display email added by the earlier
-- record-label migration. UUIDs remain the authorization/ownership keys.
CREATE FUNCTION edupulse_private.assessment_student_label() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 SELECT lower(coalesce(u.email,'')) INTO NEW.student_email FROM auth.users u WHERE u.id=NEW.student_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION edupulse_private.assessment_student_label() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER assessment_student_label BEFORE INSERT ON public.edupulse_attempts
 FOR EACH ROW EXECUTE FUNCTION edupulse_private.assessment_student_label();

-- Retain scores, answers, versions, timestamps, review state and test provenance.
UPDATE public.edupulse_attempts a SET student_email=lower(u.email)
FROM auth.users u WHERE u.id=a.student_id AND a.student_email='' AND u.email IS NOT NULL;
