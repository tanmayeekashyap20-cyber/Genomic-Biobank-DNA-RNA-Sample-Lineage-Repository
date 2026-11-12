import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getAuthenticatedUser, hasRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  if (!hasRole(user, ["Admin", "Researcher"])) {
    return NextResponse.json(
      {
        success: false,
        message: "You do not have permission to view lineage graph data.",
      },
      { status: 403 }
    );
  }

  try {
    const [
      donorSamples,
      lineageResult,
      processes,
      sampleProcesses,
      experiments,
      experimentSamples,
      sequencingResults,
    ] = await Promise.all([
      pool.query(`
        SELECT
          d.donor_id,
          d.full_name,
          s.sample_id,
          st.sample_type_name,
          s.status,
          s.collection_date,
          s.description
        FROM public.donor AS d
        LEFT JOIN public.sample AS s
          ON s.donor_id = d.donor_id
        LEFT JOIN public.sample_type AS st
          ON st.sample_type_id = s.sample_type_id
        ORDER BY d.donor_id, s.sample_id
        LIMIT 500
      `),

      pool.query(`
        SELECT
          parent_sample_id,
          child_sample_id,
          relationship_type
        FROM public.sample_lineage
        ORDER BY lineage_id
        LIMIT 500
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
    ]);

    const donors = new Map<number, {
      donor_id: string;
      full_name: string;
      samples: {
        sample_id: string;
        sample_type_name: string;
        status: string;
        collection_date: string;
        description: string | null;
      }[];
    }>();

    for (const row of donorSamples.rows) {
      const donorId = Number(row.donor_id);

      if (!donors.has(donorId)) {
        donors.set(donorId, {
          donor_id: String(row.donor_id),
          full_name: row.full_name,
          samples: [],
        });
      }

      if (row.sample_id !== null) {
        donors.get(donorId)!.samples.push({
          sample_id: String(row.sample_id),
          sample_type_name: row.sample_type_name,
          status: row.status,
          collection_date: row.collection_date,
          description: row.description,
        });
      }
    }

    const stringifyIds = (rows: Record<string, unknown>[]) =>
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            key.endsWith("_id") && value !== null
              ? String(value)
              : value,
          ])
        )
      );

    return NextResponse.json({
      success: true,
      count: donors.size,
      donors: Array.from(donors.values()),
      lineage: stringifyIds(lineageResult.rows),
      processes: stringifyIds(processes.rows),
      sampleProcesses: stringifyIds(sampleProcesses.rows),
      experiments: stringifyIds(experiments.rows),
      experimentSamples: stringifyIds(experimentSamples.rows),
      sequencingResults: stringifyIds(sequencingResults.rows),
    });
  } catch (error) {
    console.error("Failed to build lineage graph:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not retrieve lineage graph data.",
      },
      { status: 500 }
    );
  }
}
