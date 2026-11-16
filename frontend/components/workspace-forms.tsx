
"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/ui";

const donorSchema = z.object({
  full_name: z.string().trim().min(1, "Enter the donor's full name.").max(150),
  date_of_birth: z.string().optional(),
  gender: z.string().max(30).optional(),
  phone_number: z.string().max(20).optional(),
  email: z.union([
    z.string().email("Enter a valid email address."),
    z.literal(""),
  ]).optional(),
  address: z.string().optional(),
});

const sampleSchema = z.object({
  donorId: z.string().min(1, "Select a donor."),
  sampleTypeId: z.string().min(1, "Select a sample type."),
  collectionDate: z.string().min(1, "Select a collection date."),
  status: z.enum(["collected", "processing", "processed", "stored", "archived"]),
  collectionLocation: z.string().max(255),
  description: z.string(),
});

const processingSchema = z.object({
  processType: z.string().min(2, "Enter a process type."),
  date: z.string().min(1, "Select a process date."),
  researcherId: z.string().min(1, "Select a researcher."),
  inputSampleId: z.string().min(1, "Select an input sample."),
  outputSampleId: z.string().min(1, "Select an output sample."),
  description: z.string(),
  quantity: z.string(),
  unit: z.string().max(30),
}).refine(
  (value) => value.inputSampleId !== value.outputSampleId,
  {
    message: "Input and output must be different samples.",
    path: ["outputSampleId"],
  },
).refine(
  (value) => {
    if (!value.quantity.trim()) return true;
    const quantity = Number(value.quantity);
    return Number.isFinite(quantity) && quantity >= 0;
  },
  {
    message: "Enter a valid non-negative quantity.",
    path: ["quantity"],
  },
);

const experimentSchema = z.object({
  experimentName: z.string().trim().min(1, "Enter an experiment name.").max(150),
  experimentType: z.string().max(100),
  researcherId: z.string().min(1, "Select a researcher."),
  startDate: z.string(),
  endDate: z.string(),
  sampleId: z.string().min(1, "Select a sample."),
  status: z.string().min(1).max(30),
  description: z.string(),
}).refine(
  (value) =>
    !value.startDate ||
    !value.endDate ||
    value.endDate >= value.startDate,
  {
    message: "End date cannot be earlier than start date.",
    path: ["endDate"],
  },
);

function Field<T extends FieldValues>({
  label,
  name,
  register,
  error,
  children,
  type = "text",
}: {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: string;
  children?: React.ReactNode;
  type?: string;
}) {
  return (
    <div className="field-group">
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      {children ?? (
        <input
          id={name}
          className="field-input"
          type={type}
          {...register(name)}
        />
      )}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function FormShell({
  title,
  close,
  children,
  onSubmit,
  submitLabel,
  subtitle = "Complete the required fields to save this record.",
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

/* DONOR FORM */

export function DonorForm({
  initialDonorId,
  close,
  done,
}: {
  initialDonorId?: string;
  close: () => void;
  done: (message: string) => void;
}) {
  const [submitError, setSubmitError] = useState("");
  const [loadingDonor, setLoadingDonor] = useState(Boolean(initialDonorId));

  const form = useForm<z.infer<typeof donorSchema>>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      full_name: "",
      date_of_birth: "",
      gender: "",
      phone_number: "",
      email: "",
      address: "",
    },
  });

  useEffect(() => {
    if (!initialDonorId) return;

    let cancelled = false;

    async function loadDonor() {
      try {
        setSubmitError("");

        const response = await fetch("/api/donors", {
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load donor details.");
        }

        const donor = result.donors.find(
          (item: { donor_id: number | string }) =>
            String(item.donor_id) === initialDonorId,
        );

        if (!donor) {
          throw new Error("Donor was not found in PostgreSQL.");
        }

        if (!cancelled) {
          form.reset({
            full_name: donor.full_name ?? "",
            date_of_birth: donor.date_of_birth
              ? String(donor.date_of_birth).slice(0, 10)
              : "",
            gender: donor.gender ?? "",
            phone_number: donor.phone_number ?? "",
            email: donor.email ?? "",
            address: donor.address ?? "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error instanceof Error ? error.message : "Could not load donor details.",
          );
        }
      } finally {
        if (!cancelled) setLoadingDonor(false);
      }
    }

    void loadDonor();

    return () => {
      cancelled = true;
    };
  }, [initialDonorId, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const payload = {
        full_name: values.full_name.trim(),
        date_of_birth: values.date_of_birth || null,
        gender: values.gender?.trim() || null,
        phone_number: values.phone_number?.trim() || null,
        email: values.email?.trim() || null,
        address: values.address?.trim() || null,
      };

      const response = await fetch(
        initialDonorId
          ? `/api/donors?id=${encodeURIComponent(initialDonorId)}`
          : "/api/donors",
        {
          method: initialDonorId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save donor.");
      }

      done(
        initialDonorId
          ? "Donor updated successfully in PostgreSQL."
          : `Donor ${result.donor.donor_id} registered successfully in PostgreSQL.`,
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save donor.");
    }
  });

  return (
    <FormShell
      title={initialDonorId ? "Edit donor" : "Register donor"}
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={
        loadingDonor
          ? "Loading donor..."
          : form.formState.isSubmitting
            ? "Saving..."
            : initialDonorId
              ? "Save changes"
              : "Register donor"
      }
      subtitle="Donor information is stored in PostgreSQL."
    >
      <Field label="Full name" name="full_name" register={form.register} error={form.formState.errors.full_name?.message} />
      <Field label="Date of birth" name="date_of_birth" type="date" register={form.register} />
      <Field label="Gender" name="gender" register={form.register} />
      <Field label="Phone number" name="phone_number" register={form.register} />
      <Field label="Email" name="email" type="email" register={form.register} error={form.formState.errors.email?.message} />
      <Field label="Address" name="address" register={form.register} />

      {submitError && (
        <p className="field-error" role="alert">{submitError}</p>
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

/* SAMPLE FORM */

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

        const response = await fetch("/api/sample-options", {
          credentials: "include",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load database options.");
        }

        if (cancelled) return;

        setDonors(result.donors);
        setSampleTypes(result.sampleTypes);

        if (result.donors.length > 0) {
          setValue("donorId", String(result.donors[0].donor_id));
        }

        const dnaType = result.sampleTypes.find(
          (item: SampleOption) =>
            item.sample_type_name.toLowerCase() === "dna",
        );

        if (dnaType) {
          setValue("sampleTypeId", String(dnaType.sample_type_id));
        } else if (result.sampleTypes.length > 0) {
          setValue("sampleTypeId", String(result.sampleTypes[0].sample_type_id));
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Failed to load donor and sample-type options.",
          );
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
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
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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

      done(`Sample ${result.sample.sample_id} successfully registered in PostgreSQL.`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Something went wrong while registering the sample.",
      );
    }
  });

  return (
    <FormShell
      title="Register sample"
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={form.formState.isSubmitting ? "Registering..." : "Register sample"}
      subtitle="This sample will be saved directly to PostgreSQL."
    >
      {loadingOptions && <p role="status">Loading donors and sample types...</p>}
      {optionsError && <p className="field-error" role="alert">{optionsError}</p>}

      <Field label="Donor record" name="donorId" register={form.register} error={form.formState.errors.donorId?.message}>
        <select id="donorId" className="field-select" {...form.register("donorId")} disabled={loadingOptions || donors.length === 0}>
          <option value="">Select donor</option>
          {donors.map((donor) => (
            <option key={donor.donor_id} value={donor.donor_id}>
              {donor.full_name} · ID {donor.donor_id}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Sample type" name="sampleTypeId" register={form.register} error={form.formState.errors.sampleTypeId?.message}>
        <select id="sampleTypeId" className="field-select" {...form.register("sampleTypeId")} disabled={loadingOptions || sampleTypes.length === 0}>
          <option value="">Select sample type</option>
          {sampleTypes.map((sampleType) => (
            <option key={sampleType.sample_type_id} value={sampleType.sample_type_id}>
              {sampleType.sample_type_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Collection date" name="collectionDate" type="date" register={form.register} error={form.formState.errors.collectionDate?.message} />

      <Field label="Status" name="status" register={form.register}>
        <select id="status" className="field-select" {...form.register("status")}>
          <option value="collected">Collected</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="stored">Stored</option>
          <option value="archived">Archived</option>
        </select>
      </Field>

      <Field label="Collection location" name="collectionLocation" register={form.register} />
      <Field label="Description" name="description" register={form.register}>
        <textarea id="description" className="field-input" rows={3} {...form.register("description")} />
      </Field>

      {submitError && <p className="field-error" role="alert">{submitError}</p>}

      {!loadingOptions && donors.length === 0 && (
        <p className="field-error" role="alert">No donor records are available. Add a donor before registering a sample.</p>
      )}

      {!loadingOptions && sampleTypes.length === 0 && (
        <p className="field-error" role="alert">No sample types are available in the database.</p>
      )}
    </FormShell>
  );
}

/* PROCESSING FORM */

type ResearcherOption = {
  researcher_id: string;
  full_name: string;
};

type ProcessingSampleOption = {
  sample_id: string;
  sample_type_name: string;
  status: string;
};

export function ProcessingForm({
  close,
  done,
}: {
  close: () => void;
  done: (message: string) => void;
}) {
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [samples, setSamples] = useState<ProcessingSampleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const form = useForm<z.infer<typeof processingSchema>>({
    resolver: zodResolver(processingSchema),
    defaultValues: {
      processType: "",
      date: new Date().toISOString().slice(0, 10),
      researcherId: "",
      inputSampleId: "",
      outputSampleId: "",
      description: "",
      quantity: "",
      unit: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError("");

        const [researcherResponse, sampleResponse] = await Promise.all([
          fetch("/api/researchers", { credentials: "include", cache: "no-store" }),
          fetch("/api/samples", { credentials: "include", cache: "no-store" }),
        ]);

        const [researcherResult, sampleResult] = await Promise.all([
          researcherResponse.json(),
          sampleResponse.json(),
        ]);

        if (!researcherResponse.ok || !researcherResult.success) {
          throw new Error(researcherResult.message || "Could not load researchers.");
        }

        if (!sampleResponse.ok || !sampleResult.success) {
          throw new Error(sampleResult.message || "Could not load samples.");
        }

        if (cancelled) return;

        setResearchers(researcherResult.researchers);
        setSamples(sampleResult.samples);
      } catch (error) {
        if (!cancelled) {
          setOptionsError(error instanceof Error ? error.message : "Could not load processing options.");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch("/api/processing-events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          process_type: values.processType.trim(),
          process_date: values.date,
          performed_by: Number(values.researcherId),
          description: values.description.trim() || null,
          input_sample_id: Number(values.inputSampleId),
          output_sample_id: Number(values.outputSampleId),
          quantity: values.quantity.trim() ? Number(values.quantity) : null,
          unit: values.unit.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save processing event.");
      }

      done(`Processing event ${result.process.process_id} and its sample relationship were saved to PostgreSQL.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save processing event.");
    }
  });

  return (
    <FormShell
      title="Record processing event"
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={form.formState.isSubmitting ? "Saving..." : "Save processing event"}
      subtitle="The process and its input/output sample relationship will be saved together in PostgreSQL."
    >
      {loadingOptions && <p role="status">Loading researchers and samples...</p>}
      {optionsError && <p className="field-error" role="alert">{optionsError}</p>}

      <Field label="Process type" name="processType" register={form.register} error={form.formState.errors.processType?.message} />
      <Field label="Process date" name="date" type="date" register={form.register} error={form.formState.errors.date?.message} />

      <Field label="Responsible researcher" name="researcherId" register={form.register} error={form.formState.errors.researcherId?.message}>
        <select id="researcherId" className="field-select" {...form.register("researcherId")} disabled={loadingOptions || researchers.length === 0}>
          <option value="">Select researcher</option>
          {researchers.map((researcher) => (
            <option key={researcher.researcher_id} value={researcher.researcher_id}>
              {researcher.full_name} · ID {researcher.researcher_id}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Input sample" name="inputSampleId" register={form.register} error={form.formState.errors.inputSampleId?.message}>
        <select id="inputSampleId" className="field-select" {...form.register("inputSampleId")} disabled={loadingOptions || samples.length === 0}>
          <option value="">Select input sample</option>
          {samples.map((sample) => (
            <option key={sample.sample_id} value={sample.sample_id}>
              Sample {sample.sample_id} · {sample.sample_type_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Output sample" name="outputSampleId" register={form.register} error={form.formState.errors.outputSampleId?.message}>
        <select id="outputSampleId" className="field-select" {...form.register("outputSampleId")} disabled={loadingOptions || samples.length === 0}>
          <option value="">Select output sample</option>
          {samples.map((sample) => (
            <option key={sample.sample_id} value={sample.sample_id}>
              Sample {sample.sample_id} · {sample.sample_type_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Quantity (optional)" name="quantity" register={form.register} error={form.formState.errors.quantity?.message} />
      <Field label="Unit (optional)" name="unit" register={form.register} />

      <Field label="Description" name="description" register={form.register}>
        <textarea id="description" className="field-input" rows={3} {...form.register("description")} />
      </Field>

      {submitError && <p className="field-error" role="alert">{submitError}</p>}

      {!loadingOptions && researchers.length === 0 && (
        <p className="field-error" role="alert">No researchers are available. A researcher record is required.</p>
      )}

      {!loadingOptions && samples.length < 2 && (
        <p className="field-error" role="alert">At least two samples are required for a processing relationship.</p>
      )}
    </FormShell>
  );
}

/* EXPERIMENT FORM */

type ExperimentResearcherOption = {
  researcher_id: string;
  full_name: string;
};

type ExperimentSampleOption = {
  sample_id: string;
  sample_type_name: string;
  status: string;
};

export function ExperimentForm({
  close,
  done,
  ownResearcherId,
}: {
  close: () => void;
  done: (message: string) => void;
  // Set for Researcher accounts: experiments are always their own.
  ownResearcherId?: number | null;
}) {
  const [researchers, setResearchers] = useState<ExperimentResearcherOption[]>([]);
  const [samples, setSamples] = useState<ExperimentSampleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<z.infer<typeof experimentSchema>>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      experimentName: "",
      experimentType: "",
      researcherId: "",
      startDate: today,
      endDate: today,
      sampleId: "",
      status: "planned",
      description: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError("");

        const [researcherResponse, sampleResponse] = await Promise.all([
          fetch("/api/researchers", { credentials: "include", cache: "no-store" }),
          fetch("/api/samples", { credentials: "include", cache: "no-store" }),
        ]);

        const [researcherResult, sampleResult] = await Promise.all([
          researcherResponse.json(),
          sampleResponse.json(),
        ]);

        if (!researcherResponse.ok || !researcherResult.success) {
          throw new Error(researcherResult.message || "Could not load researchers.");
        }

        if (!sampleResponse.ok || !sampleResult.success) {
          throw new Error(sampleResult.message || "Could not load samples.");
        }

        if (cancelled) return;

        const allResearchers: ExperimentResearcherOption[] =
          researcherResult.researchers;

        if (ownResearcherId != null) {
          // Researchers can only create experiments assigned to themselves.
          setResearchers(
            allResearchers.filter(
              (researcher) => Number(researcher.researcher_id) === ownResearcherId
            )
          );
          form.setValue("researcherId", String(ownResearcherId));
        } else {
          setResearchers(allResearchers);
        }
        setSamples(sampleResult.samples);
      } catch (error) {
        if (!cancelled) {
          setOptionsError(error instanceof Error ? error.message : "Could not load experiment options.");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [form, ownResearcherId]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch("/api/experiment-records", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experiment_name: values.experimentName.trim(),
          experiment_type: values.experimentType.trim() || null,
          start_date: values.startDate || null,
          end_date: values.endDate || null,
          researcher_id: Number(values.researcherId),
          status: values.status,
          description: values.description.trim() || null,
          sample_id: Number(values.sampleId),
          date_added: today,
          notes: null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Could not save the experiment.");
      }

      done(`Experiment ${result.experiment.experiment_id} and its sample association were saved successfully in PostgreSQL.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save the experiment.");
    }
  });

  return (
    <FormShell
      title="Create experiment"
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={form.formState.isSubmitting ? "Saving..." : "Create experiment"}
      subtitle="The experiment and its associated sample will be saved together in PostgreSQL."
    >
      {loadingOptions && <p role="status">Loading researchers and samples...</p>}
      {optionsError && <p className="field-error" role="alert">{optionsError}</p>}

      <Field label="Experiment name" name="experimentName" register={form.register} error={form.formState.errors.experimentName?.message} />
      <Field label="Experiment type" name="experimentType" register={form.register} error={form.formState.errors.experimentType?.message} />

      <Field label="Researcher" name="researcherId" register={form.register} error={form.formState.errors.researcherId?.message}>
        <select id="researcherId" className="field-select" {...form.register("researcherId")} disabled={loadingOptions || researchers.length === 0}>
          <option value="">Select researcher</option>
          {researchers.map((researcher) => (
            <option key={researcher.researcher_id} value={researcher.researcher_id}>
              {researcher.full_name} · ID {researcher.researcher_id}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Associated sample" name="sampleId" register={form.register} error={form.formState.errors.sampleId?.message}>
        <select id="sampleId" className="field-select" {...form.register("sampleId")} disabled={loadingOptions || samples.length === 0}>
          <option value="">Select sample</option>
          {samples.map((sample) => (
            <option key={sample.sample_id} value={sample.sample_id}>
              Sample {sample.sample_id} · {sample.sample_type_name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Start date" name="startDate" type="date" register={form.register} error={form.formState.errors.startDate?.message} />
      <Field label="End date" name="endDate" type="date" register={form.register} error={form.formState.errors.endDate?.message} />

      <Field label="Status" name="status" register={form.register}>
        <select id="experimentStatus" className="field-select" {...form.register("status")}>
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On hold</option>
        </select>
      </Field>

      <Field label="Description" name="description" register={form.register}>
        <textarea id="experimentDescription" className="field-input" rows={3} {...form.register("description")} />
      </Field>

      {submitError && <p className="field-error" role="alert">{submitError}</p>}

      {!loadingOptions && researchers.length === 0 && (
        <p className="field-error" role="alert">No researchers are available. Add a researcher first.</p>
      )}

      {!loadingOptions && samples.length === 0 && (
        <p className="field-error" role="alert">No samples are available. Register a sample first.</p>
      )}
    </FormShell>
  );
}
