-- Immutable private teaching attachments. Course JSON holds references, never binary payloads.
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES('edupulse-teaching-files','edupulse-teaching-files',false,4000000)
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=excluded.file_size_limit;

CREATE POLICY edupulse_teaching_file_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='edupulse-teaching-files' AND
 ((SELECT edupulse_private.academic_role())='admin' OR
 ((SELECT edupulse_private.academic_role())='instructor' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text)));

CREATE POLICY edupulse_teaching_file_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='edupulse-teaching-files' AND (
 (SELECT edupulse_private.academic_role())='admin' OR
 ((SELECT edupulse_private.academic_role())='instructor' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text) OR
 EXISTS(SELECT 1 FROM public.edupulse_publications p WHERE p.active
  AND p.instructor_id::text=(storage.foldername(name))[1]
  AND coalesce(p.content->'attachments','[]'::jsonb) @> jsonb_build_array(jsonb_build_object('path',name)))
));
-- Publication SELECT RLS supplies release/course/enrollment checks for students.
-- No UPDATE/DELETE policy: a released file cannot be replaced behind a saved assessment/material version.
