import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  getAuthenticatedUser,
  hasRole,
  type AllowedRole,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const READ_ROLES: AllowedRole[] = ["Admin", "Researcher"];

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, READ_ROLES)) {
    return NextResponse.json(
      { success: false, message: "You do not have permission to view records." },
      { status: 403 }
    );
  }

  try {
    const [
      donors,
      samples,
      processes,
      sampleProcesses,
      experiments,
      experimentSamples,
      sequencingResults,
      storageUnits,
      sampleStorage,
    ] = await Promise.all([
      pool.query(`
        SELECT
          d.donor_id,
          d.registration_date,
          latest_consent.status AS consent_status
        FROM public.donor d
        LEFT JOIN LATERAL (
          SELECT c.status
          FROM public.consent c
          WHERE c.donor_id = d.donor_id
          ORDER BY c.consent_date DESC, c.consent_id DESC
          LIMIT 1
        ) latest_consent ON TRUE
        ORDER BY d.donor_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          s.sample_id,
          s.donor_id,
          st.sample_type_name,
          s.collection_date,
          s.collection_location,
          s.status,
          s.description,
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'storage_id', su.storage_id,
                'freezer_id', su.freezer_id,
                'rack_no', su.rack_no,
                'box_no', su.box_no,
                'position', su.position,
                'temperature', su.temperature,
                'storage_status', su.status,
                'stored_date', ss.stored_date,
                'removed_date', ss.removed_date
              )
              ORDER BY ss.stored_date DESC
            )
            FROM public.sample_storage ss
            JOIN public.storage_unit su
              ON su.storage_id = ss.storage_id
            WHERE ss.sample_id = s.sample_id
              AND ss.removed_date IS NULL
          ) AS storage_locations,
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'related_sample_id', sl.child_sample_id,
                'relationship_type', sl.relationship_type,
                'direction', 'child'
              )
            )
            FROM public.sample_lineage sl
            WHERE sl.parent_sample_id = s.sample_id
          ) AS lineage_children,
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'related_sample_id', sl.parent_sample_id,
                'relationship_type', sl.relationship_type,
                'direction', 'parent'
              )
            )
            FROM public.sample_lineage sl
            WHERE sl.child_sample_id = s.sample_id
          ) AS lineage_parents
        FROM public.sample s
        JOIN public.sample_type st
          ON st.sample_type_id = s.sample_type_id
        ORDER BY s.sample_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          p.process_id,
          p.process_type,
          p.process_date,
          p.performed_by,
          r.full_name AS researcher_name,
          p.description
        FROM public.process p
        JOIN public.researcher r
          ON r.researcher_id = p.performed_by
        ORDER BY p.process_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          sp.sample_process_id,
          sp.process_id,
          p.process_type,
          sp.input_sample_id,
          sp.output_sample_id,
          sp.quantity,
          sp.unit
        FROM public.sample_process sp
        JOIN public.process p
          ON p.process_id = sp.process_id
        ORDER BY sp.sample_process_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          e.experiment_id,
          e.experiment_name,
          e.experiment_type,
          e.start_date,
          e.end_date,
          e.researcher_id,
          r.full_name AS researcher_name,
          e.status,
          e.description
        FROM public.experiment e
        JOIN public.researcher r
          ON r.researcher_id = e.researcher_id
        ORDER BY e.experiment_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          es.experiment_sample_id,
          es.experiment_id,
          e.experiment_name,
          es.sample_id,
          s.status AS sample_status,
          es.date_added,
          es.notes
        FROM public.experiment_sample es
        JOIN public.experiment e
          ON e.experiment_id = es.experiment_id
        JOIN public.sample s
          ON s.sample_id = es.sample_id
        ORDER BY es.experiment_sample_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          sr.sequencing_result_id,
          sr.sample_id,
          sr.experiment_id,
          sr.sequencing_platform,
          sr.run_date,
          sr.file_path,
          sr.result_status,
          sr.notes,
          e.experiment_name,
          s.status AS sample_status
        FROM public.sequencing_result sr
        JOIN public.sample s
          ON s.sample_id = sr.sample_id
        LEFT JOIN public.experiment e
          ON e.experiment_id = sr.experiment_id
        ORDER BY sr.sequencing_result_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          storage_id,
          freezer_id,
          rack_no,
          box_no,
          position,
          temperature,
          status
        FROM public.storage_unit
        ORDER BY storage_id
        LIMIT 100
      `),

      pool.query(`
        SELECT
          ss.sample_storage_id,
          ss.sample_id,
          ss.storage_id,
          ss.stored_date,
          ss.removed_date,
          su.freezer_id,
          su.rack_no,
          su.box_no,
          su.position,
          su.temperature,
          su.status AS storage_status
        FROM public.sample_storage ss
        JOIN public.storage_unit su
          ON su.storage_id = ss.storage_id
        ORDER BY ss.sample_storage_id
        LIMIT 100
      `),
    ]);

    return NextResponse.json({
      success: true,
      records: {
        donors: donors.rows,
        samples: samples.rows,
        processes: processes.rows,
        sample_processes: sampleProcesses.rows,
        experiments: experiments.rows,
        experiment_samples: experimentSamples.rows,
        sequencing_results: sequencingResults.rows,
        storage_units: storageUnits.rows,
        sample_storage: sampleStorage.rows,
      },
      counts: {
        donors: donors.rows.length,
        samples: samples.rows.length,
        processes: processes.rows.length,
        sample_processes: sampleProcesses.rows.length,
        experiments: experiments.rows.length,
        experiment_samples: experimentSamples.rows.length,
        sequencing_results: sequencingResults.rows.length,
        storage_units: storageUnits.rows.length,
        sample_storage: sampleStorage.rows.length,
      },
      limit: 100,
    });
  } catch (error) {
    console.error("Failed to fetch repository records:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not fetch repository records.",
      },
      { status: 500 }
    );
  }
}
