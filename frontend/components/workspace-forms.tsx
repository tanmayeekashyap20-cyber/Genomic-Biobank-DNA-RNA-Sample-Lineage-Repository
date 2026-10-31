"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues, type Path, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/ui";
import { useDemoData } from "@/components/demo-data-provider";
import type {
  Donor,
  Experiment,
  ProcessingEvent,
} from "@/lib/types";

const donorSchema = z.object({ codedId: z.string().min(4, "Use at least 4 characters."), consentStatus: z.enum(["Active", "Pending", "Withdrawn"]), cohort: z.string().min(1), ageBand: z.string().min(1) });
const sampleSchema = z.object({
  donorId: z.string().min(1, "Select a donor."),
  sampleTypeId: z.string().min(1, "Select a sample type."),
  collectionDate: z.string().min(1, "Select a collection date."),
  status: z.enum(["collected", "processing", "processed", "stored", "archived"]),
  collectionLocation: z.string().max(255, "Maximum 255 characters."),
  description: z.string(),
});
const processingSchema = z.object({ processType: z.string().min(2), date: z.string().min(1), researcher: z.string().min(2), inputSampleId: z.string().min(1), outputSampleId: z.string().min(1) }).refine((value) => value.inputSampleId !== value.outputSampleId, { message: "Input and output must be different samples.", path: ["outputSampleId"] });
const experimentSchema = z.object({ researcher: z.string().min(2), type: z.string().min(2), startDate: z.string().min(1), endDate: z.string().min(1), sampleId: z.string().min(1), status: z.enum(["Planned", "In progress", "Complete", "On hold"]) }).refine((value) => value.endDate >= value.startDate, { message: "End date must be on or after start date.", path: ["endDate"] });

function Field<T extends FieldValues>({ label, name, register, error, children, type = "text" }: { label: string; name: Path<T>; register: UseFormRegister<T>; error?: string; children?: React.ReactNode; type?: string }) {
  return <div className="field-group"><label htmlFor={name} className="field-label">{label}</label>{children ?? <input id={name} className="field-input" type={type} {...register(name)} />}{error && <span className="field-error" role="alert">{error}</span>}</div>;
}

function FormShell({
  title,
  close,
  children,
  onSubmit,
  submitLabel,
  subtitle = "This record is stored in session-local synthetic demo data.",
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  subtitle?: string;
}) {
  return (
    <Modal title={title} subtitle={subtitle} onClose={close}>
      <form onSubmit={onSubmit}>
        <div className="form-grid">{children}</div>
        <div className="modal-footer" style={{ padding: "20px 0 0" }}>
          <button type="button" className="button" onClick={close}>
            Cancel
          </button>
          <button className="button button-primary" type="submit">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DonorForm({ initialDonor, close, done }: { initialDonor?: Donor; close: () => void; done: (message: string) => void }) {
  const { data, addDonor, updateDonor } = useDemoData();
  const form = useForm<z.infer<typeof donorSchema>>({ resolver: zodResolver(donorSchema), defaultValues: initialDonor ? { codedId: initialDonor.codedId, consentStatus: initialDonor.consentStatus, cohort: initialDonor.cohort, ageBand: initialDonor.ageBand } : { codedId: "", consentStatus: "Pending", cohort: "Cohort A", ageBand: "40-49" } });
  const submit = form.handleSubmit((values) => { const duplicate = data.donors.some((donor) => donor.codedId.toLowerCase() === values.codedId.toLowerCase() && donor.id !== initialDonor?.id); if (duplicate) { form.setError("codedId", { message: "This coded identifier is already in use." }); return; } if (initialDonor) { updateDonor({ ...initialDonor, ...values }); done(`Donor ${initialDonor.id} updated in this demo session.`); return; } const id = `DNR-${2400 + data.donors.length + 1}`; const donor: Donor = { id, ...values, registeredAt: new Date().toISOString().slice(0, 10) }; addDonor(donor); done(`Donor ${id} added to this demo session.`); });
  return <FormShell title={initialDonor ? "Edit donor" : "Register donor"} close={close} onSubmit={(event) => { void submit(event); }} submitLabel={initialDonor ? "Save changes" : "Register donor"}><Field label="Coded identifier" name="codedId" register={form.register} error={form.formState.errors.codedId?.message} /><Field label="Consent status" name="consentStatus" register={form.register}><select id="consentStatus" className="field-select" {...form.register("consentStatus")}><option>Pending</option><option>Active</option><option>Withdrawn</option></select></Field><Field label="Cohort" name="cohort" register={form.register}><select id="cohort" className="field-select" {...form.register("cohort")}><option>Cohort A</option><option>Cohort B</option><option>Cohort C</option></select></Field><Field label="Age band" name="ageBand" register={form.register}><select id="ageBand" className="field-select" {...form.register("ageBand")}><option>18-29</option><option>30-39</option><option>40-49</option><option>50-59</option><option>60-69</option><option>70+</option></select></Field></FormShell>;
}

type SampleOption = {
  sample_type_id: string;
  sample_type_name: string;
};

type DonorOption = {
  donor_id: string;
  full_name: string;
};

export function SampleForm({
  close,
  done,
}: {
  close: () => void;
  done: (message: string) => void;
}) {
  const [donors, setDonors] = useState<DonorOption[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const form = useForm<z.infer<typeof sampleSchema>>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      donorId: "",
      sampleTypeId: "",
      collectionDate: new Date().toISOString().slice(0, 10),
      status: "collected",
      collectionLocation: "",
      description: "",
    },
  });

  const { setValue } = form;

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError("");

        const response = await fetch("/api/sample-options");
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Could not load database options."
          );
        }

        if (cancelled) return;

        setDonors(result.donors);
        setSampleTypes(result.sampleTypes);

        if (result.donors.length > 0) {
          setValue("donorId", String(result.donors[0].donor_id));
        }

        const dnaType = result.sampleTypes.find(
          (item: SampleOption) =>
            item.sample_type_name.toLowerCase() === "dna"
        );

        if (dnaType) {
          setValue("sampleTypeId", String(dnaType.sample_type_id));
        } else if (result.sampleTypes.length > 0) {
          setValue(
            "sampleTypeId",
            String(result.sampleTypes[0].sample_type_id)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Failed to load donor and sample-type options."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [setValue]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch("/api/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donor_id: Number(values.donorId),
          sample_type_id: Number(values.sampleTypeId),
          collection_date: values.collectionDate,
          collection_location: values.collectionLocation.trim() || null,
          status: values.status,
          description: values.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not register sample.");
      }

      const sampleId = result.sample.sample_id;
      done(`Sample ${sampleId} successfully registered in PostgreSQL.`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Something went wrong while registering the sample."
      );
    }
  });

  return (
    <FormShell
      title="Register sample"
      close={close}
      onSubmit={(event) => {
        void submit(event);
      }}
      submitLabel={form.formState.isSubmitting ? "Registering..." : "Register sample"}
      subtitle="This sample will be saved directly to the PostgreSQL database."
    >
      {loadingOptions && (
        <p role="status">Loading donors and sample types...</p>
      )}

      {optionsError && (
        <p className="field-error" role="alert">
          {optionsError}
        </p>
      )}

      <Field
        label="Donor record"
        name="donorId"
        register={form.register}
        error={form.formState.errors.donorId?.message}
      >
        <select
          id="donorId"
          className="field-select"
          {...form.register("donorId")}
          disabled={loadingOptions || donors.length === 0}
        >
          <option value="">Select donor</option>
          {donors.map((donor) => (
            <option key={donor.donor_id} value={donor.donor_id}>
              {donor.full_name} · ID {donor.donor_id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Sample type"
        name="sampleTypeId"
        register={form.register}
        error={form.formState.errors.sampleTypeId?.message}
      >
        <select
          id="sampleTypeId"
          className="field-select"
          {...form.register("sampleTypeId")}
          disabled={loadingOptions || sampleTypes.length === 0}
        >
          <option value="">Select sample type</option>
          {sampleTypes.map((sampleType) => (
            <option
              key={sampleType.sample_type_id}
              value={sampleType.sample_type_id}
            >
              {sampleType.sample_type_name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Collection date"
        name="collectionDate"
        register={form.register}
        type="date"
        error={form.formState.errors.collectionDate?.message}
      />

      <Field
        label="Status"
        name="status"
        register={form.register}
        error={form.formState.errors.status?.message}
      >
        <select
          id="status"
          className="field-select"
          {...form.register("status")}
        >
          <option value="collected">Collected</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="stored">Stored</option>
          <option value="archived">Archived</option>
        </select>
      </Field>

      <Field
        label="Collection location"
        name="collectionLocation"
        register={form.register}
        error={form.formState.errors.collectionLocation?.message}
      />

      <Field
        label="Description"
        name="description"
        register={form.register}
      >
        <textarea
          id="description"
          className="field-input"
          rows={3}
          {...form.register("description")}
        />
      </Field>

      {submitError && (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      )}

      {!loadingOptions && donors.length === 0 && (
        <p className="field-error" role="alert">
          No donor records are available. Add a donor before registering a sample.
        </p>
      )}

      {!loadingOptions && sampleTypes.length === 0 && (
        <p className="field-error" role="alert">
          No sample types are available in the database.
        </p>
      )}
    </FormShell>
  );
}

export function ProcessingForm({ close, done }: { close: () => void; done: (message: string) => void }) {
  const { data, addProcessing } = useDemoData();
  const form = useForm<z.infer<typeof processingSchema>>({ resolver: zodResolver(processingSchema), defaultValues: { processType: "DNA extraction", date: new Date().toISOString().slice(0, 10), researcher: "Demo Researcher", inputSampleId: data.samples[0]?.id ?? "", outputSampleId: data.samples[1]?.id ?? "" } });
  const submit = form.handleSubmit((values) => { const queue = [values.outputSampleId]; const visited = new Set(queue); while (queue.length) { const current = queue.shift()!; for (const event of data.processing.filter((item) => item.inputSampleIds.includes(current))) for (const outputId of event.outputSampleIds) if (!visited.has(outputId)) { visited.add(outputId); queue.push(outputId); } } if (visited.has(values.inputSampleId)) { form.setError("outputSampleId", { message: "This relationship would create a sample derivation cycle." }); return; } const event: ProcessingEvent = { id: `PRC-${300 + data.processing.length + 1}`, processType: values.processType, date: values.date, researcher: values.researcher, inputSampleIds: [values.inputSampleId], outputSampleIds: [values.outputSampleId] }; addProcessing(event); done(`Processing event ${event.id} recorded with explicit input and output samples.`); });
  return <FormShell title="Record processing event" close={close} onSubmit={(event) => { void submit(event); }} submitLabel="Save event"><Field label="Process type" name="processType" register={form.register} error={form.formState.errors.processType?.message} /><Field label="Process date" name="date" type="date" register={form.register} error={form.formState.errors.date?.message} /><Field label="Responsible researcher" name="researcher" register={form.register} error={form.formState.errors.researcher?.message} /><Field label="Input sample" name="inputSampleId" register={form.register} error={form.formState.errors.inputSampleId?.message}><select id="inputSampleId" className="field-select" {...form.register("inputSampleId")}><option value="">Select input sample</option>{data.samples.map((sample) => <option key={sample.id} value={sample.id}>{sample.id} · {sample.type}</option>)}</select></Field><Field label="Output sample" name="outputSampleId" register={form.register} error={form.formState.errors.outputSampleId?.message}><select id="outputSampleId" className="field-select" {...form.register("outputSampleId")}><option value="">Select output sample</option>{data.samples.map((sample) => <option key={sample.id} value={sample.id}>{sample.id} · {sample.type}</option>)}</select></Field></FormShell>;
}

export function ExperimentForm({ close, done }: { close: () => void; done: (message: string) => void }) {
  const { data, addExperiment } = useDemoData();
  const form = useForm<z.infer<typeof experimentSchema>>({ resolver: zodResolver(experimentSchema), defaultValues: { researcher: "Demo Researcher", type: "Library preparation", startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10), sampleId: data.samples[0]?.id ?? "", status: "Planned" } });
  const submit = form.handleSubmit((values) => { const experiment: Experiment = { id: `EXP-${700 + data.experiments.length + 1}`, researcher: values.researcher, type: values.type, startDate: values.startDate, endDate: values.endDate, sampleIds: [values.sampleId], status: values.status }; addExperiment(experiment); done(`Experiment ${experiment.id} added to this demo session.`); });
  return <FormShell title="Create experiment" close={close} onSubmit={(event) => { void submit(event); }} submitLabel="Create experiment"><Field label="Experiment type" name="type" register={form.register} error={form.formState.errors.type?.message} /><Field label="Researcher" name="researcher" register={form.register} error={form.formState.errors.researcher?.message} /><Field label="Start date" name="startDate" type="date" register={form.register} error={form.formState.errors.startDate?.message} /><Field label="End date" name="endDate" type="date" register={form.register} error={form.formState.errors.endDate?.message} /><Field label="Associated sample" name="sampleId" register={form.register} error={form.formState.errors.sampleId?.message}><select id="sampleId" className="field-select" {...form.register("sampleId")}><option value="">Select sample</option>{data.samples.map((sample) => <option key={sample.id} value={sample.id}>{sample.id} · {sample.type}</option>)}</select></Field><Field label="Status" name="status" register={form.register}><select id="status" className="field-select" {...form.register("status")}><option>Planned</option><option>In progress</option><option>Complete</option><option>On hold</option></select></Field></FormShell>;
}