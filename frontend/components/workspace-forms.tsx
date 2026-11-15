"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues, type Path, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/ui";
import type {
  DatabaseDonor,
  DatabaseExperiment,
  DatabaseExperimentSample,
  DatabaseProcess,
  DatabaseSampleProcess,
  DatabaseSample,
  DatabaseStorageUnit,
  DatabaseSequencingResult,
} from "@/lib/types";

const donorSchema = z.object({
  full_name: z.string().trim().min(1, "Enter a donor name.").max(150),
  date_of_birth: z.string().refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid date."
  ),
  gender: z.string().trim().max(30),
  phone_number: z.string().trim().max(20),
  email: z.union([
    z.string().trim().email("Enter a valid email address.").max(255),
    z.literal(""),
  ]),
  address: z.string(),
});
const sampleSchema = z.object({
  donorId: z.string().min(1, "Select a donor."),
  sampleTypeId: z.string().min(1, "Select a sample type."),
  collectionDate: z.string().min(1, "Select a collection date."),
  status: z.string().trim().min(1, "Select a status.").max(30),
  collectionLocation: z.string().max(255, "Maximum 255 characters."),
  description: z.string(),
});
const processingSchema = z.object({
  processType: z.string().trim().min(2, "Enter a process type.").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date."),
  researcherId: z.string().min(1, "Select a researcher."),
  inputSampleId: z.string(),
  outputSampleId: z.string(),
  description: z.string(),
}).refine(
  (value) =>
    !value.inputSampleId ||
    !value.outputSampleId ||
    value.inputSampleId !== value.outputSampleId,
  { message: "Select two different samples.", path: ["outputSampleId"] }
);
const experimentSchema = z.object({
  name: z.string().trim().min(1, "Enter an experiment name.").max(150),
  type: z.string().trim().max(100),
  researcherId: z.string().min(1, "Select a researcher."),
  startDate: z.string(),
  endDate: z.string(),
  sampleId: z.string(),
  status: z.string().trim().min(1, "Enter a status.").max(30),
  description: z.string(),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: "End date must be on or after start date.",
  path: ["endDate"],
}).refine(
  (value) => !value.startDate || /^\d{4}-\d{2}-\d{2}$/.test(value.startDate),
  { message: "Enter a valid start date.", path: ["startDate"] }
).refine(
  (value) => !value.endDate || /^\d{4}-\d{2}-\d{2}$/.test(value.endDate),
  { message: "Enter a valid end date.", path: ["endDate"] }
);

const sequencingSchema = z.object({
  sampleId: z.string().min(1, "Select a sample."),
  experimentId: z.string(),
  platform: z.string().trim().max(100),
  runDate: z.string().refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid date."
  ),
  filePath: z.string(),
  status: z.string().trim().min(1).max(30),
  notes: z.string(),
});
const sequencingMetadataSchema = z.object({
  platform: z.string().max(100, "Maximum 100 characters."),
  runDate: z.string().refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "Enter a valid date."
  ),
  filePath: z.string(),
  status: z.string().trim().min(1, "Enter a result status.").max(30, "Maximum 30 characters."),
  notes: z.string(),
});

const storageAssignmentSchema = z.object({
  sampleId: z.string().min(1, "Select a sample."),
  storageId: z.string().min(1, "Select an available storage location."),
});
const storageUnitSchema = z.object({
  freezer_id: z.string().trim().max(50, "Maximum 50 characters."),
  rack_no: z.string().trim().max(50, "Maximum 50 characters."),
  box_no: z.string().trim().max(50, "Maximum 50 characters."),
  position: z.string().trim().max(50, "Maximum 50 characters."),
  temperature: z.string().trim().refine((value) => {
    if (!value) return true;
    const temperature = Number(value);
    return Number.isFinite(temperature) && temperature >= -999.99 && temperature <= 999.99;
  }, "Enter a temperature between -999.99 and 999.99."),
  status: z.string().trim().min(1, "Enter a status.").max(30, "Maximum 30 characters."),
});

function Field<T extends FieldValues>({ label, name, register, error, children, type = "text" }: { label: string; name: Path<T>; register: UseFormRegister<T>; error?: string; children?: React.ReactNode; type?: string }) {
  return <div className="field-group"><label htmlFor={name} className="field-label">{label}</label>{children ?? <input id={name} className="field-input" type={type} {...register(name)} />}{error && <span className="field-error" role="alert">{error}</span>}</div>;
}

function FormShell({
  title,
  close,
  children,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  subtitle = "This record is submitted to the configured backend API.",
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  isSubmitting?: boolean;
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
          <button className="button button-primary" type="submit" disabled={isSubmitting}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}


export function DonorForm({
  initialDonor,
  close,
  done,
}: {
  initialDonor?: DatabaseDonor;
  close: () => void;
  done: (message: string) => void;
}) {
  const [submitError, setSubmitError] = useState("");

  const form = useForm<z.infer<typeof donorSchema>>({
    resolver: zodResolver(donorSchema),
    defaultValues: initialDonor
      ? {
          full_name: initialDonor.full_name,
          date_of_birth: initialDonor.date_of_birth ?? "",
          gender: initialDonor.gender ?? "",
          phone_number: initialDonor.phone_number ?? "",
          email: initialDonor.email ?? "",
          address: initialDonor.address ?? "",
        }
      : {
          full_name: "",
          date_of_birth: "",
          gender: "",
          phone_number: "",
          email: "",
          address: "",
        },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      if (initialDonor && !/^[1-9]\d*$/.test(initialDonor.donor_id)) {
        throw new Error("Cannot update donor without a valid PostgreSQL donor ID.");
      }

      const donorPayload = {
        full_name: values.full_name,
        date_of_birth: values.date_of_birth || null,
        gender: values.gender || null,
        phone_number: values.phone_number || null,
        email: values.email || null,
        address: values.address.trim() || null,
      };
      const response = await fetch(
        initialDonor
          ? `/api/donors?id=${encodeURIComponent(initialDonor.donor_id)}`
          : "/api/donors",
        {
          method: initialDonor ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(donorPayload),
        }
      );

      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
        donor?: DatabaseDonor;
        errors?: Partial<
          Record<
            keyof z.infer<typeof donorSchema>,
            string[]
          >
        >;
      };

      if (!response.ok || !result.success) {
        const donorFields = [
          "full_name",
          "date_of_birth",
          "gender",
          "phone_number",
          "email",
          "address",
        ] as const;
        for (const field of donorFields) {
          const message = result.errors?.[field]?.[0];
          if (message) {
            form.setError(field, { type: "server", message });
          }
        }
        throw new Error(
          result.message ||
            (result.errors ? "Please correct the highlighted fields." : "Could not save donor.")
        );
      }

      const donorId = result.donor?.donor_id;
      if (!donorId || !/^[1-9]\d*$/.test(String(donorId))) {
        throw new Error("Donor was saved, but a valid PostgreSQL donor ID was not returned.");
      }

      done(
        initialDonor
          ? `Donor ${donorId} updated successfully.`
          : `Donor ${donorId} registered successfully.`
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Could not save donor."
      );
    }
  });

  return (
    <FormShell
      title={initialDonor ? "Edit donor" : "Register donor"}
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={form.formState.isSubmitting ? "Saving..." : "Save donor"}
      isSubmitting={form.formState.isSubmitting}
      subtitle="Donor information will be saved to PostgreSQL."
    >
      <Field
        label="Full name"
        name="full_name"
        register={form.register}
        error={form.formState.errors.full_name?.message}
      />

      <Field
        label="Date of birth"
        name="date_of_birth"
        register={form.register}
        type="date"
        error={form.formState.errors.date_of_birth?.message}
      />

      <Field
        label="Gender"
        name="gender"
        register={form.register}
        error={form.formState.errors.gender?.message}
      />

      <Field
        label="Phone number"
        name="phone_number"
        register={form.register}
        type="tel"
        error={form.formState.errors.phone_number?.message}
      />

      <Field
        label="Email"
        name="email"
        register={form.register}
        type="email"
        error={form.formState.errors.email?.message}
      />

      <Field label="Address" name="address" register={form.register}>
        <textarea
          id="address"
          className="field-input"
          rows={3}
          {...form.register("address")}
        />
      </Field>

      {submitError && (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      )}
    </FormShell>
  );
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
  initialSample,
  close,
  done,
}: {
  initialSample?: DatabaseSample;
  close: () => void;
  done: (message: string) => void;
}) {
  const [donors, setDonors] = useState<DonorOption[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(!initialSample);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const form = useForm<z.infer<typeof sampleSchema>>({
    resolver: zodResolver(sampleSchema),
    defaultValues: {
      donorId: initialSample?.donor_id ?? "",
      sampleTypeId: initialSample ? "not-used-for-update" : "",
      collectionDate: initialSample?.collection_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      status: initialSample?.status ?? "collected",
      collectionLocation: initialSample?.collection_location ?? "",
      description: initialSample?.description ?? "",
    },
  });

  const { setValue } = form;

  useEffect(() => {
    if (initialSample) return;
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
  }, [initialSample, setValue]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch(
        initialSample
          ? `/api/samples?id=${encodeURIComponent(initialSample.sample_id)}`
          : "/api/samples",
        {
        method: initialSample ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initialSample ? {
          status: values.status,
          collection_location: values.collectionLocation.trim(),
          description: values.description.trim(),
        } : {
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
      done(initialSample
        ? `Sample ${sampleId} updated in PostgreSQL.`
        : `Sample ${sampleId} successfully registered in PostgreSQL.`);
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
      title={initialSample ? `Edit sample ${initialSample.sample_id}` : "Register sample"}
      close={close}
      onSubmit={(event) => {
        void submit(event);
      }}
      submitLabel={form.formState.isSubmitting ? "Saving..." : initialSample ? "Save changes" : "Register sample"}
      isSubmitting={form.formState.isSubmitting}
      subtitle={initialSample ? "Only fields supported by the sample update API are editable." : "This sample will be saved directly to the PostgreSQL database."}
    >
      {!initialSample && loadingOptions && (
        <p role="status">Loading donors and sample types...</p>
      )}

      {!initialSample && optionsError && (
        <p className="field-error" role="alert">
          {optionsError}
        </p>
      )}

      {!initialSample && <Field
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
      </Field>}

      {!initialSample && <Field
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
      </Field>}

      {!initialSample && <Field
        label="Collection date"
        name="collectionDate"
        register={form.register}
        type="date"
        error={form.formState.errors.collectionDate?.message}
      />}

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
          {initialSample && !["collected", "processing", "processed", "stored", "archived"].includes(initialSample.status) && <option value={initialSample.status}>{initialSample.status}</option>}
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

      {!initialSample && !loadingOptions && donors.length === 0 && (
        <p className="field-error" role="alert">
          No donor records are available. Add a donor before registering a sample.
        </p>
      )}

      {!initialSample && !loadingOptions && sampleTypes.length === 0 && (
        <p className="field-error" role="alert">
          No sample types are available in the database.
        </p>
      )}
    </FormShell>
  );
}

type FormOption = { id: string; label: string };

type OptionSource = "samples" | "researchers" | "experiments" | "storageUnits";

function useDatabaseOptions(requiredSources: string) {
  const [samples, setSamples] = useState<FormOption[]>([]);
  const [researchers, setResearchers] = useState<FormOption[]>([]);
  const [experiments, setExperiments] = useState<FormOption[]>([]);
  const [storageUnits, setStorageUnits] = useState<FormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const sources: Record<OptionSource, { path: string; key: string }> = {
          samples: { path: "/api/samples", key: "samples" },
          researchers: { path: "/api/researchers", key: "researchers" },
          experiments: { path: "/api/experiments", key: "experiments" },
          storageUnits: { path: "/api/storage-units", key: "storage_units" },
        };
        const loaded = await Promise.all(
          (requiredSources.split(",") as OptionSource[]).map(async (source) => {
            const { path, key } = sources[source];
            const response = await fetch(path, { cache: "no-store" });
            const body = await response.json();
            if (!response.ok || !body.success || !Array.isArray(body[key])) {
              throw new Error(body.message || `Could not load ${source} options.`);
            }
            return [source, body[key]] as const;
          })
        );
        const values = Object.fromEntries(loaded) as Partial<Record<OptionSource, unknown[]>>;
        if (!active) return;
        setSamples(
          ((values.samples ?? []) as { sample_id: number; sample_type_name: string }[]).map((sample) => ({
            id: String(sample.sample_id),
            label: `${sample.sample_id} · ${sample.sample_type_name}`,
          }))
        );
        setResearchers(
          ((values.researchers ?? []) as { researcher_id: number; full_name: string }[]).map((researcher) => ({
            id: String(researcher.researcher_id),
            label: researcher.full_name,
          }))
        );
        setExperiments(
          ((values.experiments ?? []) as { experiment_id: number; experiment_name: string }[]).map((experiment) => ({
            id: String(experiment.experiment_id),
            label: experiment.experiment_name,
          }))
        );
        setStorageUnits(
          ((values.storageUnits ?? []) as { status: string; storage_id: number; freezer_id: string | null; rack_no: string | null; box_no: string | null; position: string | null }[])
            .filter((unit) => unit.status === "available")
            .map((unit) => ({
              id: String(unit.storage_id),
              label: [unit.freezer_id, unit.rack_no, unit.box_no, unit.position].filter(Boolean).join(" / ") || `Location ${unit.storage_id}`,
            }))
        );
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load database options."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [requiredSources]);

  return { samples, researchers, experiments, storageUnits, loading, error };
}

function OptionSelect<T extends FieldValues>({
  id,
  label,
  options,
  register,
  name,
  disabled,
  error,
}: {
  id: string;
  label: string;
  options: FormOption[];
  register: UseFormRegister<T>;
  name: Path<T>;
  disabled: boolean;
  error?: string;
}) {
  return (
    <div className="field-group">
      <label htmlFor={id} className="field-label">{label}</label>
      <select id={id} className="field-select" {...register(name)} disabled={disabled}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      {error && <span className="field-error" role="alert">{error}</span>}
      {!disabled && options.length === 0 && (
        <span className="field-error">No database options are available.</span>
      )}
    </div>
  );
}

async function requestJson(path: string, method: "POST" | "PATCH", payload: object) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    const validationMessages =
      typeof result.errors === "object" && result.errors !== null
        ? Object.values(result.errors as Record<string, unknown>)
            .flatMap((messages) => Array.isArray(messages) ? messages : [])
            .filter((message): message is string => typeof message === "string")
            .join(" ")
        : "";
    throw new Error(
      result.message ||
        validationMessages ||
        "The database request failed."
    );
  }
  return result;
}

export function ProcessingForm({
  initialProcess,
  sampleProcesses = [],
  close,
  done,
}: {
  initialProcess?: DatabaseProcess;
  sampleProcesses?: DatabaseSampleProcess[];
  close: () => void;
  done: (message: string) => void;
}) {
  const options = useDatabaseOptions("samples,researchers");
  const [submitError, setSubmitError] = useState("");
  const form = useForm<z.infer<typeof processingSchema>>({
    resolver: zodResolver(processingSchema),
    defaultValues: {
      processType: initialProcess?.process_type ?? "",
      date: initialProcess?.process_date.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      researcherId: initialProcess ? String(initialProcess.performed_by) : "",
      inputSampleId: "",
      outputSampleId: "",
      description: initialProcess?.description ?? "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setSubmitError("");
    if (!initialProcess && (!values.inputSampleId || !values.outputSampleId)) {
      if (!values.inputSampleId) {
        form.setError("inputSampleId", { message: "Select an input sample." });
      }
      if (!values.outputSampleId) {
        form.setError("outputSampleId", { message: "Select an output sample." });
      }
      return;
    }

    if (initialProcess && !/^[1-9]\d*$/.test(initialProcess.process_id)) {
      setSubmitError("Cannot update a process without a valid PostgreSQL ID.");
      return;
    }

    let processId: string | undefined;
    try {
      const payload = {
        process_type: values.processType,
        process_date: values.date,
        performed_by: Number(values.researcherId),
        description: values.description.trim() || null,
      };
      if (initialProcess) {
        await requestJson(
          `/api/processes?id=${encodeURIComponent(initialProcess.process_id)}`,
          "PATCH",
          payload
        );
        done(`Process ${initialProcess.process_id} was updated. Existing sample relationships were preserved.`);
        return;
      }
      const created = await requestJson("/api/processing-events", "POST", {
        ...payload,
        input_sample_id: Number(values.inputSampleId),
        output_sample_id: Number(values.outputSampleId),
      });
      processId = String(created.process.process_id);
      done(`Processing record ${processId} was saved to PostgreSQL.`);
    } catch (error) {
      setSubmitError(
        processId
          ? `Process ${processId} exists, but its sample relationship was not saved. ${error instanceof Error ? error.message : ""}`
          : error instanceof Error ? error.message : "Could not save processing record."
      );
    }
  });
  return (
    <FormShell title={initialProcess ? `Edit process ${initialProcess.process_id}` : "Record processing event"} close={close} onSubmit={(event) => { void submit(event); }} submitLabel={form.formState.isSubmitting ? "Saving..." : initialProcess ? "Save changes" : "Save event"} isSubmitting={form.formState.isSubmitting} subtitle={initialProcess ? "Editing process details will preserve the existing sample relationships." : "Processing and sample relationships are saved through the PostgreSQL APIs."}>
      {options.loading && <p role="status">Loading samples and researchers...</p>}
      {options.error && <p className="field-error" role="alert">{options.error}</p>}
      <Field label="Process type" name="processType" register={form.register} error={form.formState.errors.processType?.message} />
      <Field label="Process date" name="date" type="date" register={form.register} error={form.formState.errors.date?.message} />
      <OptionSelect id="researcherId" label="Responsible researcher" options={options.researchers} register={form.register} name="researcherId" disabled={options.loading || !!options.error} error={form.formState.errors.researcherId?.message} />
      {initialProcess ? (
        <div className="field-group">
          <span className="field-label">Existing sample relationships (preserved)</span>
          <div className="detail-value">
            {sampleProcesses.length
              ? sampleProcesses.map((link) => `${link.input_sample_id} → ${link.output_sample_id}`).join(", ")
              : "No sample relationships"}
          </div>
        </div>
      ) : (
        <>
          <OptionSelect id="inputSampleId" label="Input sample" options={options.samples} register={form.register} name="inputSampleId" disabled={options.loading || !!options.error} error={form.formState.errors.inputSampleId?.message} />
          <OptionSelect id="outputSampleId" label="Output sample" options={options.samples} register={form.register} name="outputSampleId" disabled={options.loading || !!options.error} error={form.formState.errors.outputSampleId?.message} />
        </>
      )}
      <Field label="Description" name="description" register={form.register}>
        <textarea id="description" className="field-input" rows={3} {...form.register("description")} />
      </Field>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
    </FormShell>
  );
}

export function ExperimentForm({
  initialExperiment,
  experimentSamples = [],
  close,
  done,
}: {
  initialExperiment?: DatabaseExperiment;
  experimentSamples?: DatabaseExperimentSample[];
  close: () => void;
  done: (message: string) => void;
}) {
  const options = useDatabaseOptions("samples,researchers");
  const [submitError, setSubmitError] = useState("");
  const form = useForm<z.infer<typeof experimentSchema>>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      name: initialExperiment?.experiment_name ?? "",
      type: initialExperiment?.experiment_type ?? "",
      researcherId: initialExperiment ? String(initialExperiment.researcher_id) : "",
      startDate: initialExperiment?.start_date?.slice(0, 10) ?? "",
      endDate: initialExperiment?.end_date?.slice(0, 10) ?? "",
      sampleId: "",
      status: initialExperiment?.status ?? "planned",
      description: initialExperiment?.description ?? "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    setSubmitError("");
    if (!initialExperiment && !values.sampleId) {
      form.setError("sampleId", { message: "Select a sample." });
      return;
    }
    if (initialExperiment && !/^[1-9]\d*$/.test(initialExperiment.experiment_id)) {
      setSubmitError("Cannot update an experiment without a valid PostgreSQL ID.");
      return;
    }
    try {
      const payload = {
        experiment_name: values.name,
        experiment_type: values.type || null,
        start_date: values.startDate || null,
        end_date: values.endDate || null,
        researcher_id: Number(values.researcherId),
        status: values.status,
        description: values.description.trim() || null,
      };
      if (initialExperiment) {
        await requestJson(
          `/api/experiments?id=${encodeURIComponent(initialExperiment.experiment_id)}`,
          "PATCH",
          payload
        );
        done(`Experiment ${initialExperiment.experiment_id} was updated. Existing sample associations were preserved.`);
        return;
      }
      if (values.type && values.startDate) {
        const created = await requestJson("/api/experiment-records", "POST", {
          ...payload,
          experiment_type: values.type,
          start_date: values.startDate,
          sample_id: Number(values.sampleId),
          date_added: new Date().toISOString().slice(0, 10),
        });
        done(`Experiment ${created.experiment.experiment_id} was saved to PostgreSQL.`);
      } else {
        const created = await requestJson("/api/experiments", "POST", payload);
        const experimentId = String(created.experiment.experiment_id);
        try {
          await requestJson("/api/experiment-samples", "POST", {
            experiment_id: Number(experimentId),
            sample_id: Number(values.sampleId),
          });
        } catch (error) {
          done(
            `Experiment ${experimentId} was saved, but its sample association failed: ${
              error instanceof Error ? error.message : "unknown API error"
            }`
          );
          return;
        }
        done(`Experiment ${experimentId} was saved to PostgreSQL.`);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save experiment.");
    }
  });
  return (
    <FormShell title={initialExperiment ? `Edit experiment ${initialExperiment.experiment_id}` : "Create experiment"} close={close} onSubmit={(event) => { void submit(event); }} submitLabel={form.formState.isSubmitting ? "Saving..." : initialExperiment ? "Save changes" : "Create experiment"} isSubmitting={form.formState.isSubmitting} subtitle={initialExperiment ? "Editing experiment details will preserve its existing sample associations." : "The experiment and its sample association are saved through PostgreSQL APIs."}>
      {options.loading && <p role="status">Loading samples and researchers...</p>}
      {options.error && <p className="field-error" role="alert">{options.error}</p>}
      <Field label="Experiment name" name="name" register={form.register} error={form.formState.errors.name?.message} />
      <Field label="Experiment type" name="type" register={form.register} error={form.formState.errors.type?.message} />
      <OptionSelect id="researcherId" label="Researcher" options={options.researchers} register={form.register} name="researcherId" disabled={options.loading || !!options.error} error={form.formState.errors.researcherId?.message} />
      <Field label="Start date" name="startDate" type="date" register={form.register} error={form.formState.errors.startDate?.message} />
      <Field label="End date" name="endDate" type="date" register={form.register} error={form.formState.errors.endDate?.message} />
      {initialExperiment ? (
        <div className="field-group">
          <span className="field-label">Associated samples (preserved)</span>
          <div className="detail-value">
            {experimentSamples.length
              ? experimentSamples.map((link) => {
                  const sample = options.samples.find((item) => item.id === String(link.sample_id));
                  return sample?.label ?? `Sample ${link.sample_id}`;
                }).join(", ")
              : "No sample associations"}
          </div>
        </div>
      ) : (
        <OptionSelect id="sampleId" label="Associated sample" options={options.samples} register={form.register} name="sampleId" disabled={options.loading || !!options.error} error={form.formState.errors.sampleId?.message} />
      )}
      <Field label="Status" name="status" register={form.register} error={form.formState.errors.status?.message}>
        <select id="status" className="field-select" {...form.register("status")}>
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Complete</option>
          <option value="on_hold">On hold</option>
        </select>
      </Field>
      <Field label="Description" name="description" register={form.register}>
        <textarea id="description" className="field-input" rows={3} {...form.register("description")} />
      </Field>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
    </FormShell>
  );
}

export function StorageAssignmentForm({ close, done }: { close: () => void; done: (message: string) => void }) {
  const options = useDatabaseOptions("samples,storageUnits");
  const [submitError, setSubmitError] = useState("");
  const form = useForm<z.infer<typeof storageAssignmentSchema>>({
    resolver: zodResolver(storageAssignmentSchema),
    defaultValues: { sampleId: "", storageId: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");
      const result = await requestJson("/api/sample-storage", "POST", {
        sample_id: Number(values.sampleId),
        storage_id: Number(values.storageId),
      });
      done(`Sample assigned to storage record ${result.sample_storage.sample_storage_id}.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not assign sample to storage.");
    }
  });
  return (
    <FormShell title="Assign sample to storage" close={close} onSubmit={(event) => { void submit(event); }} submitLabel={form.formState.isSubmitting ? "Saving..." : "Assign sample"} isSubmitting={form.formState.isSubmitting} subtitle="Assignments are stored in PostgreSQL. Only available locations are selectable.">
      {options.loading && <p role="status">Loading samples and storage locations...</p>}
      {options.error && <p className="field-error" role="alert">{options.error}</p>}
      <OptionSelect id="sampleId" label="Sample" options={options.samples} register={form.register} name="sampleId" disabled={options.loading || !!options.error} error={form.formState.errors.sampleId?.message} />
      <OptionSelect id="storageId" label="Available storage location" options={options.storageUnits} register={form.register} name="storageId" disabled={options.loading || !!options.error} error={form.formState.errors.storageId?.message} />
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
    </FormShell>
  );
}

export function StorageUnitForm({ initialStorageUnit, close, done }: { initialStorageUnit?: DatabaseStorageUnit; close: () => void; done: (message: string) => void }) {
  const [submitError, setSubmitError] = useState("");
  const form = useForm<z.infer<typeof storageUnitSchema>>({
    resolver: zodResolver(storageUnitSchema),
    defaultValues: {
      freezer_id: initialStorageUnit?.freezer_id ?? "",
      rack_no: initialStorageUnit?.rack_no ?? "",
      box_no: initialStorageUnit?.box_no ?? "",
      position: initialStorageUnit?.position ?? "",
      temperature: initialStorageUnit?.temperature === null || initialStorageUnit?.temperature === undefined
        ? ""
        : String(initialStorageUnit.temperature),
      status: initialStorageUnit?.status ?? "available",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    const payload = {
      freezer_id: values.freezer_id || null,
      rack_no: values.rack_no || null,
      box_no: values.box_no || null,
      position: values.position || null,
      temperature: values.temperature ? Number(values.temperature) : null,
      status: values.status,
    };
    try {
      setSubmitError("");
      const path = initialStorageUnit
        ? `/api/storage-units?id=${encodeURIComponent(String(initialStorageUnit.storage_id))}`
        : "/api/storage-units";
      const result = await requestJson(path, initialStorageUnit ? "PATCH" : "POST", payload);
      done(initialStorageUnit
        ? `Storage unit ${result.storage_unit.storage_id} was updated.`
        : `Storage unit ${result.storage_unit.storage_id} was created.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save storage unit.");
    }
  });

  return (
    <FormShell
      title={initialStorageUnit ? `Edit storage unit ${initialStorageUnit.storage_id}` : "Create storage unit"}
      close={close}
      onSubmit={(event) => { void submit(event); }}
      submitLabel={form.formState.isSubmitting ? "Saving..." : initialStorageUnit ? "Save changes" : "Create storage unit"}
      isSubmitting={form.formState.isSubmitting}
      subtitle="Storage-unit details are saved to PostgreSQL."
    >
      <Field label="Freezer" name="freezer_id" register={form.register} error={form.formState.errors.freezer_id?.message} />
      <Field label="Rack" name="rack_no" register={form.register} error={form.formState.errors.rack_no?.message} />
      <Field label="Box" name="box_no" register={form.register} error={form.formState.errors.box_no?.message} />
      <Field label="Position" name="position" register={form.register} error={form.formState.errors.position?.message} />
      <Field label="Temperature" name="temperature" register={form.register} error={form.formState.errors.temperature?.message} type="number" />
      <Field label="Status" name="status" register={form.register} error={form.formState.errors.status?.message} />
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
    </FormShell>
  );
}

export function SequencingResultForm({ initialResult, close, done }: { initialResult?: DatabaseSequencingResult; close: () => void; done: (message: string) => void }) {
  return initialResult
    ? <EditSequencingResultForm initialResult={initialResult} close={close} done={done} />
    : <CreateSequencingResultForm close={close} done={done} />;
}

function EditSequencingResultForm({ initialResult, close, done }: { initialResult: DatabaseSequencingResult; close: () => void; done: (message: string) => void }) {
  const [submitError, setSubmitError] = useState("");
  const form = useForm<z.infer<typeof sequencingMetadataSchema>>({
    resolver: zodResolver(sequencingMetadataSchema),
    defaultValues: {
      platform: initialResult.sequencing_platform ?? "",
      runDate: initialResult.run_date ?? "",
      filePath: initialResult.file_path ?? "",
      status: initialResult.result_status,
      notes: initialResult.notes ?? "",
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");
      await requestJson(
        `/api/sequencing-results?id=${encodeURIComponent(String(initialResult.sequencing_result_id))}`,
        "PATCH",
        {
          sequencing_platform: values.platform || null,
          run_date: values.runDate || null,
          file_path: values.filePath || null,
          result_status: values.status,
          notes: values.notes || null,
        }
      );
      done(`Sequencing result ${initialResult.sequencing_result_id} was updated.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not update sequencing result.");
    }
  });
  return (
    <FormShell title={`Edit sequencing result ${initialResult.sequencing_result_id}`} close={close} onSubmit={(event) => { void submit(event); }} submitLabel={form.formState.isSubmitting ? "Saving..." : "Save changes"} isSubmitting={form.formState.isSubmitting} subtitle="Edit metadata only; linked sample and experiment are preserved.">
      <div className="field-group"><span className="field-label">Linked records</span><p className="detail-value">Sample {initialResult.sample_id} · {initialResult.sample_status}{initialResult.experiment_id === null ? " · No experiment" : ` · ${initialResult.experiment_name ?? `Experiment ${initialResult.experiment_id}`}`}</p></div>
      <Field label="Sequencing platform" name="platform" register={form.register} error={form.formState.errors.platform?.message} />
      <Field label="Run date" name="runDate" type="date" register={form.register} error={form.formState.errors.runDate?.message} />
      <Field label="File path" name="filePath" register={form.register} error={form.formState.errors.filePath?.message} />
      <Field label="Result status" name="status" register={form.register} error={form.formState.errors.status?.message} />
      <Field label="Notes" name="notes" register={form.register}>
        <textarea id="notes" className="field-input" rows={3} {...form.register("notes")} />
      </Field>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
    </FormShell>
  );
}

function CreateSequencingResultForm({ close, done }: { close: () => void; done: (message: string) => void }) {
  const options = useDatabaseOptions("samples,experiments");
  const [submitError, setSubmitError] = useState("");
  const form = useForm<z.infer<typeof sequencingSchema>>({
    resolver: zodResolver(sequencingSchema),
    defaultValues: { sampleId: "", experimentId: "", platform: "", runDate: "", filePath: "", status: "pending", notes: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");
      const result = await requestJson("/api/sequencing-results", "POST", {
        sample_id: Number(values.sampleId),
        experiment_id: values.experimentId ? Number(values.experimentId) : null,
        sequencing_platform: values.platform || null,
        run_date: values.runDate || null,
        file_path: values.filePath || null,
        result_status: values.status,
        notes: values.notes || null,
      });
      done(`Sequencing result ${result.sequencing_result.sequencing_result_id} was saved to PostgreSQL.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save sequencing result.");
    }
  });
  return (
    <FormShell title="Record sequencing result" close={close} onSubmit={(event) => { void submit(event); }} submitLabel={form.formState.isSubmitting ? "Saving..." : "Save result"} isSubmitting={form.formState.isSubmitting} subtitle="Record metadata only; this form does not create read-count or quality metrics.">
      {options.loading && <p role="status">Loading samples and experiments...</p>}
      {options.error && <p className="field-error" role="alert">{options.error}</p>}
      <OptionSelect id="sampleId" label="Sample" options={options.samples} register={form.register} name="sampleId" disabled={options.loading || !!options.error} error={form.formState.errors.sampleId?.message} />
      <OptionSelect id="experimentId" label="Experiment (optional)" options={options.experiments} register={form.register} name="experimentId" disabled={options.loading || !!options.error} error={form.formState.errors.experimentId?.message} />
      <Field label="Sequencing platform" name="platform" register={form.register} error={form.formState.errors.platform?.message} />
      <Field label="Run date" name="runDate" type="date" register={form.register} error={form.formState.errors.runDate?.message} />
      <Field label="File path" name="filePath" register={form.register} error={form.formState.errors.filePath?.message} />
      <Field label="Result status" name="status" register={form.register} error={form.formState.errors.status?.message} />
      <Field label="Notes" name="notes" register={form.register}>
        <textarea id="notes" className="field-input" rows={3} {...form.register("notes")} />
      </Field>
      {submitError && <p className="field-error" role="alert">{submitError}</p>}
    </FormShell>
  );
}