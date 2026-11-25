"""Reconcile only this session's generated allocations after the owner's scope correction."""
import json
import os
from pathlib import Path
import subprocess

root = Path(".data/population-20261125")
before = json.loads((root / "before.json").read_text("utf-8"))
workspaces = json.loads((root / "scope-workspaces.json").read_text("utf-8"))
records = json.loads((root / "scope-records.result.json").read_text("utf-16"))["rows"][0]["snapshot"]
counts = records["counts"]
if counts["attempts"] != len(before["edupulse_attempts"]) or any(counts[k] for k in ["joins", "comments", "submissions"]):
    raise RuntimeError("Preserve new activity before reconciling generated allocations.")

def q(value):
    return "'" + str(value).replace("'", "''") + "'"

def j(value):
    return q(json.dumps(value, ensure_ascii=False, separators=(",", ":"))) + "::jsonb"

actor = next(a for a in before["accounts"] if a["app_metadata"].get("role") == "admin")
dean = next(a for a in before["accounts"] if a["app_metadata"].get("role") == "dean")
management = {"sub": dean["id"], "email": dean["email"], "role": "authenticated", "app_metadata": dean["app_metadata"]}
cli = Path(os.environ["APPDATA"]) / "npm/node_modules/supabase/dist/supabase.js"
for index, workspace in enumerate(workspaces):
    receipt = root / f"scope-reconcile-{index}.receipt.json"
    if receipt.exists():
        continue
    owner = next(a for a in before["accounts"] if a["id"] == workspace["owner_id"])
    original = next((w for w in before["edupulse_workspaces"] if w["owner_id"] == owner["id"]), None)
    data = original["data"] if original else {"syllabi": [], "content": {}, "registrations": []}
    ids = [s["id"] for s in data["syllabi"]]
    enrollments = [e for e in before["edupulse_enrollments"] if e["instructor_id"] == owner["id"]]
    all_loads = [r for r in before["edupulse_institutional_records"] if r["kind"] == "loads" and r["data"].get("InstructorID") == owner["id"]]
    loads = [r for r in all_loads if r["data"].get("AcademicYear") == "2026-2027" and r["data"].get("Semester") == "1st Semester"]
    extra = [r for r in records["loads"] if r["data"].get("InstructorID") == owner["id"] and not any(o["record_key"] == r["record_key"] for o in all_loads)]
    claims = {"sub": owner["id"], "email": owner["email"], "role": "authenticated", "app_metadata": owner["app_metadata"]}
    guard = f"""BEGIN
      IF (SELECT revision FROM public.edupulse_workspaces WHERE owner_id={q(owner["id"])}::uuid)<>{workspace["revision"]} THEN RAISE EXCEPTION 'Workspace changed since scope review'; END IF;
      IF EXISTS(SELECT 1 FROM public.edupulse_attempts WHERE instructor_id={q(owner["id"])}::uuid AND id NOT IN(SELECT (v->>'id')::uuid FROM jsonb_array_elements({j(before["edupulse_attempts"])})v)) THEN RAISE EXCEPTION 'Preserve new learner activity'; END IF;
    END;"""
    manifest = {"owner": owner["id"], "removedCreatedLoads": [r["record_key"] for r in extra], "restoredOriginalWorkspace": True, "reason": "Owner narrowed to CIT and explicitly loaded other students; no new learner activity existed"}
    sql = f"""BEGIN;
    SET LOCAL statement_timeout='90s';
    DO {q(guard)};
    SELECT set_config('request.jwt.claims',{j(claims)}::text,true);
    UPDATE public.edupulse_enrollments e SET suspended=true WHERE e.instructor_id={q(owner["id"])}::uuid AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements({j(enrollments)})b WHERE b->>'course_id'=e.course_id AND b->>'student_email'=e.student_email);
    SET LOCAL ROLE authenticated;
    SELECT revision FROM public.edupulse_save_workspace({workspace["revision"]},(SELECT jsonb_set(jsonb_set(data,'{{syllabi}}',(SELECT coalesce(jsonb_agg(CASE WHEN s->>'id' IN(SELECT jsonb_array_elements_text({j(ids)})) THEN s ELSE s||'{{"status":"archived","suspended":true}}'::jsonb END),'[]') FROM jsonb_array_elements(data->'syllabi')s)),'{{content}}',(SELECT coalesce(jsonb_object_agg(k,CASE WHEN v->>'syllabusId' IN(SELECT jsonb_array_elements_text({j(ids)})) THEN v ELSE jsonb_set(v,'{{status}}','"hidden"') END),'{{}}') FROM jsonb_each(data->'content')AS c(k,v))) FROM public.edupulse_workspaces WHERE owner_id=auth.uid()));
    RESET ROLE;
    SELECT set_config('request.jwt.claims',{j(management)}::text,true);
    DELETE FROM public.edupulse_institutional_records r WHERE r.kind='loads' AND r.record_key IN(SELECT v->>'record_key' FROM jsonb_array_elements({j(extra)})v) AND r.data->>'InstructorID'={q(owner["id"])};
    INSERT INTO public.edupulse_institutional_records(kind,record_key,data,updated_by,updated_at) SELECT 'loads',v->>'record_key',v->'data',(v->>'updated_by')::uuid,(v->>'updated_at')::timestamptz FROM jsonb_array_elements({j(loads)})v ON CONFLICT(kind,record_key) DO UPDATE SET data=excluded.data,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims',{j(claims)}::text,true);
    SELECT revision FROM public.edupulse_save_workspace({workspace["revision"]+1},{j(data)});
    RESET ROLE;
    DELETE FROM public.edupulse_notices WHERE publication_id IN(SELECT p.id FROM public.edupulse_publications p WHERE p.instructor_id={q(owner["id"])}::uuid AND p.id NOT IN(SELECT v->>'id' FROM jsonb_array_elements({j(before["edupulse_publications"])})v));
    DELETE FROM public.edupulse_delivery_schedules WHERE instructor_id={q(owner["id"])}::uuid AND course_id NOT IN(SELECT v->>'id' FROM jsonb_array_elements({j(before["edupulse_courses"])})v);
    INSERT INTO edupulse_private.population_batches(id,actor_id,provenance,manifest,completed_at) VALUES({q("academic-population-2026-11-25:scope-reconcile:"+str(index))},{q(actor["id"])}::uuid,'owner-authorized-generated-population',{j(manifest)},now());
    COMMIT;"""
    path = root / f"scope-reconcile-{index}.sql"
    path.write_text(sql, "utf-8")
    result = subprocess.run(["node", str(cli), "db", "query", "--linked", "--file", str(path), "--output", "json"], capture_output=True)
    if result.returncode:
        (root / f"scope-reconcile-{index}.error.log").write_bytes(result.stderr)
        raise RuntimeError(f"Scope reconciliation stopped at instructor {index+1}; inspect the private diagnostic.")
    receipt.write_bytes(result.stdout)
    print(json.dumps({"reconciled": index+1, "removedBroadLoads": len(extra), "accountsDeleted": 0}), flush=True)
