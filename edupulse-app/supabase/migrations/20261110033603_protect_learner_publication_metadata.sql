-- Publication rows are the learner-facing DTO. Keep teacher AI prompts, source
-- excerpts, verification traces and marked-answer review metadata in the owner
-- workspace only. The full-content version hash and private scoring keys stay
-- unchanged, including during backfill, so existing attempts remain valid.
CREATE FUNCTION edupulse_private.protect_publication_metadata()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 NEW.content := NEW.content - 'ai' - 'answerKey' - 'answer_key' - 'correctAnswers' - 'correct_answers';
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION edupulse_private.protect_publication_metadata() FROM PUBLIC,anon,authenticated;

CREATE TRIGGER protect_publication_metadata
 BEFORE INSERT OR UPDATE OF content ON public.edupulse_publications
 FOR EACH ROW EXECUTE FUNCTION edupulse_private.protect_publication_metadata();

UPDATE public.edupulse_publications
 SET content=content - 'ai' - 'answerKey' - 'answer_key' - 'correctAnswers' - 'correct_answers'
 WHERE content ?| ARRAY['ai','answerKey','answer_key','correctAnswers','correct_answers'];
