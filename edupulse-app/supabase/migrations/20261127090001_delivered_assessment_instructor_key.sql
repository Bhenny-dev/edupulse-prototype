-- Keep the published assessment key separate from the student and staff academic snapshots.
CREATE FUNCTION edupulse_private.instructor_assessment_key(publication text, version text, subject uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
  owner_id uuid := auth.uid();
  published public.edupulse_publications;
  answers jsonb;
  source jsonb;
BEGIN
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Instructor sign-in required' USING ERRCODE='42501';
  END IF;
  IF subject IS NOT NULL THEN
    IF edupulse_private.support_account(subject, '{}'::jsonb)->>'role' IS DISTINCT FROM 'instructor' THEN
      RAISE EXCEPTION 'Select a verified instructor' USING ERRCODE='42501';
    END IF;
    owner_id := subject;
  ELSIF edupulse_private.academic_role() IS DISTINCT FROM 'instructor' THEN
    RAISE EXCEPTION 'Instructor sign-in required' USING ERRCODE='42501';
  END IF;

  SELECT p.* INTO published
  FROM public.edupulse_publications p
  JOIN public.edupulse_courses c ON c.id = p.course_id
  WHERE p.id = publication AND p.instructor_id = owner_id AND c.instructor_id = owner_id
    AND p.type = 'assessment' AND p.active AND c.active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current owned assessment required' USING ERRCODE='42501';
  END IF;
  IF published.source_version IS DISTINCT FROM version THEN
    RAISE EXCEPTION 'This assessment changed. Reopen the current delivery.' USING ERRCODE='40001';
  END IF;

  SELECT k.answers INTO answers
  FROM edupulse_private.assessment_keys k
  WHERE k.publication_id = published.id AND k.source_version = published.source_version;
  IF answers IS NULL THEN
    RAISE EXCEPTION 'The key is unavailable for this assessment version.' USING ERRCODE='22023';
  END IF;
  SELECT w.data->'content'->published.workspace_item_id->'content' INTO source
  FROM public.edupulse_workspaces w WHERE w.owner_id = published.instructor_id;
  IF md5(source::text) IS DISTINCT FROM published.source_version THEN
    source := NULL;
  END IF;

  RETURN jsonb_build_object(
    'questions', (SELECT jsonb_agg(jsonb_build_object(
      'correctIndex', q.value,
      'explanation', source->'questions'->(q.ordinality::int - 1)->>'explanation'
    ) ORDER BY q.ordinality) FROM jsonb_array_elements(answers) WITH ORDINALITY AS q)
  );
END $$;

CREATE FUNCTION public.edupulse_instructor_assessment_key(publication text, version text, subject uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT edupulse_private.instructor_assessment_key(publication, version, subject);
$$;

REVOKE ALL ON FUNCTION edupulse_private.instructor_assessment_key(text,text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.edupulse_instructor_assessment_key(text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION edupulse_private.instructor_assessment_key(text,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edupulse_instructor_assessment_key(text,text,uuid) TO authenticated;
