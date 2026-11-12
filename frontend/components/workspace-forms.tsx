
"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui";

const donorSchema = z.object({
  full_name: z.string().min(2, "Enter the donor's full name."),
  date_of_birth: z.string().min(1, "Select a date of birth."),
  gender: z.string().min(1, "Select a gender."),
  phone_number: z.string().optional(),
  email: z.string().email("Enter a valid email address.").or(z.literal("")),
  address: z.string().optional(),
});

const sampleSchema = z.object({
  donorId: z.string().min(1, "Select a donor."),
  sampleTypeId: z.string().min(1, "Select a sample type."),
  collectionDate: z.string().min(1, "Select a collection date."),
  status: z.enum([
    "collected",
    "processing",
    "processed",
    "stored",
    "archived",
  ]),
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
  unit: z.string(),
}).refine(
  (value) => value.inputSampleId !== value.outputSampleId,
  {
    message: "Input and output must be different samples.",
    path: ["outputSampleId"],
  }
);

const experimentSchema = z.object({
  researcherId: z.string().min(1, "Select a researcher."),
  name: z.string().min(2, "Enter an experiment name."),
  type: z.string().min(2, "Enter an experiment type."),
  startDate: z.string().min(1, "Select a start date."),
  endDate: z.string().optional(),
  sampleId: z.string().min(1, "Select a sample."),
  status: z.enum([
    "planned",
    "in_progress",
    "completed",
    "on_hold",
  ]),
  description: z.string(),
  notes: z.string(),
}).refine(
  (value) =>
    !value.endDate ||
    value.endDate >= value.startDate,
  {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  }
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
  subtitle = "This record will be saved to the genomic biobank database.",
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

        <div
          className="modal-footer"
          style={{ padding: "20px 0 0" }}
        >
          <button
            type="button"
            className="button"
            onClick={close}
          >
            Cancel
          </button>

          <button
            className="button button-primary"
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

async function readApiResponse(response: Response) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ||
        result.message ||
        "The database request could not be completed."
    );
  }

  return result;
}

type ResearcherOption = {
  researcher_id: string | number;
  full_name: string;
};

type SampleOption = {
  sample_id: string | number;
  sample_type_name?: string;
  status?: string;
};

type DonorOption = {
  donor_id: string | number;
  full_name: string;
};

type SampleTypeOption = {
  sample_type_id: string | number;
  sample_type_name: string;
};

/* -------------------------------------------------------------------------- */
/* Donor form                                                                  */
/* -------------------------------------------------------------------------- */

export function DonorForm({
  initialDonorId,
  close,
  done,
}: {
  initialDonorId?: string;
  close: () => void;
  done: (message: string) => void;
}) {
  const [loadingDonor, setLoadingDonor] = useState(
    Boolean(initialDonorId)
  );
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

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
        setLoadingDonor(true);
        setLoadError("");

        const response = await fetch("/api/donors", {
          credentials: "include",
          cache: "no-store",
        });

        const result = await readApiResponse(response);
        const donor = result.donors?.find(
          (item: Record<string, unknown>) =>
            String(item.donor_id) === String(initialDonorId)
        );

        if (!donor) {
          throw new Error(
            "The selected donor could not be found in the database."
          );
        }

        if (cancelled) return;

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
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load the donor record."
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

      const editing = Boolean(initialDonorId);

      const response = await fetch("/api/donors", {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...(editing
            ? { donor_id: Number(initialDonorId) }
            : {}),
          full_name: values.full_name.trim(),
          date_of_birth: values.date_of_birth,
          gender: values.gender,
          phone_number: values.phone_number?.trim() || null,
          email: values.email.trim() || null,
          address: values.address?.trim() || null,
        }),
      });

      const result = await readApiResponse(response);

      const donorId =
        result.donor?.donor_id ??
        initialDonorId ??
        "new donor";

      done(
        editing
          ? `Donor ${donorId} updated in PostgreSQL.`
          : `Donor ${donorId} registered in PostgreSQL.`
      );
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not save the donor record."
      );
    }
  });

  return (
    <FormShell
      title={initialDonorId ? "Edit donor" : "Register donor"}
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={
        form.formState.isSubmitting
          ? "Saving..."
          : initialDonorId
            ? "Save changes"
            : "Register donor"
      }
      subtitle="Donor details are saved in the PostgreSQL donor table."
    >
      {loadingDonor && (
        <p role="status">Loading donor information...</p>
      )}

      {loadError && (
        <p className="field-error" role="alert">
          {loadError}
        </p>
      )}

      <Field
        label="Full name"
        name="full_name"
        register={form.register}
        error={form.formState.errors.full_name?.message}
      />

      <Field
        label="Date of birth"
        name="date_of_birth"
        type="date"
        register={form.register}
        error={form.formState.errors.date_of_birth?.message}
      />

      <Field
        label="Gender"
        name="gender"
        register={form.register}
        error={form.formState.errors.gender?.message}
      >
        <select
          id="gender"
          className="field-select"
          {...form.register("gender")}
        >
          <option value="">Select gender</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Other">Other</option>
          <option value="Prefer not to say">
            Prefer not to say
          </option>
        </select>
      </Field>

      <Field
        label="Phone number"
        name="phone_number"
        register={form.register}
        error={form.formState.errors.phone_number?.message}
      />

      <Field
        label="Email address"
        name="email"
        type="email"
        register={form.register}
        error={form.formState.errors.email?.message}
      />

      <Field
        label="Address"
        name="address"
        register={form.register}
      />

      {submitError && (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      )}
    </FormShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Sample form                                                                 */
/* -------------------------------------------------------------------------- */

export function SampleForm({
  close,
  done,
}: {
  close: () => void;
  done: (message: string) => void;
}) {
  const [donors, setDonors] = useState<DonorOption[]>([]);
  const [sampleTypes, setSampleTypes] = useState<SampleTypeOption[]>([]);
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

        const result = await readApiResponse(response);

        if (cancelled) return;

        setDonors(result.donors ?? []);
        setSampleTypes(result.sampleTypes ?? []);

        if (result.donors?.length) {
          form.setValue(
            "donorId",
            String(result.donors[0].donor_id)
          );
        }

        const dnaType = result.sampleTypes?.find(
          (item: SampleTypeOption) =>
            item.sample_type_name.toLowerCase() === "dna"
        );

        if (dnaType) {
          form.setValue(
            "sampleTypeId",
            String(dnaType.sample_type_id)
          );
        } else if (result.sampleTypes?.length) {
          form.setValue(
            "sampleTypeId",
            String(result.sampleTypes[0].sample_type_id)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Could not load donor and sample type options."
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
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch("/api/samples", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          donor_id: Number(values.donorId),
          sample_type_id: Number(values.sampleTypeId),
          collection_date: values.collectionDate,
          collection_location:
            values.collectionLocation.trim() || null,
          status: values.status,
          description: values.description.trim() || null,
        }),
      });

      const result = await readApiResponse(response);
      const sampleId = result.sample?.sample_id ?? "new sample";

      done(`Sample ${sampleId} registered in PostgreSQL.`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not register the sample."
      );
    }
  });

  return (
    <FormShell
      title="Register sample"
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={
        form.formState.isSubmitting
          ? "Registering..."
          : "Register sample"
      }
      subtitle="This sample will be saved directly to PostgreSQL."
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
            <option
              key={donor.donor_id}
              value={donor.donor_id}
            >
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
          No donor records are available. Register a donor first.
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

/* -------------------------------------------------------------------------- */
/* Processing form                                                             */
/* -------------------------------------------------------------------------- */

export function ProcessingForm({
  close,
  done,
}: {
  close: () => void;
  done: (message: string) => void;
}) {
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [samples, setSamples] = useState<SampleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const form = useForm<z.infer<typeof processingSchema>>({
    resolver: zodResolver(processingSchema),
    defaultValues: {
      processType: "DNA extraction",
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

        const [researcherResponse, sampleResponse] =
          await Promise.all([
            fetch("/api/researchers", {
              credentials: "include",
              cache: "no-store",
            }),
            fetch("/api/samples", {
              credentials: "include",
              cache: "no-store",
            }),
          ]);

        const [researcherResult, sampleResult] =
          await Promise.all([
            readApiResponse(researcherResponse),
            readApiResponse(sampleResponse),
          ]);

        if (cancelled) return;

        setResearchers(researcherResult.researchers ?? []);
        setSamples(sampleResult.samples ?? []);

        if (researcherResult.researchers?.length) {
          form.setValue(
            "researcherId",
            String(researcherResult.researchers[0].researcher_id)
          );
        }

        if (sampleResult.samples?.length) {
          form.setValue(
            "inputSampleId",
            String(sampleResult.samples[0].sample_id)
          );

          if (sampleResult.samples.length > 1) {
            form.setValue(
              "outputSampleId",
              String(sampleResult.samples[1].sample_id)
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Could not load researchers and samples."
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
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch("/api/processing-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          process_type: values.processType.trim(),
          process_date: values.date,
          performed_by: Number(values.researcherId),
          description: values.description.trim() || null,
          input_sample_id: Number(values.inputSampleId),
          output_sample_id: Number(values.outputSampleId),
          quantity: values.quantity
            ? Number(values.quantity)
            : null,
          unit: values.unit.trim() || null,
        }),
      });

      const result = await readApiResponse(response);

      const processId =
        result.process?.process_id ?? "new event";

      done(`Processing event ${processId} saved in PostgreSQL.`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not save the processing event."
      );
    }
  });

  return (
    <FormShell
      title="Record processing event"
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={
        form.formState.isSubmitting ? "Saving..." : "Save event"
      }
      subtitle="The process and its sample association are saved together."
    >
      {loadingOptions && (
        <p role="status">Loading researchers and samples...</p>
      )}

      {optionsError && (
        <p className="field-error" role="alert">
          {optionsError}
        </p>
      )}

      <Field
        label="Process type"
        name="processType"
        register={form.register}
        error={form.formState.errors.processType?.message}
      />

      <Field
        label="Process date"
        name="date"
        type="date"
        register={form.register}
        error={form.formState.errors.date?.message}
      />

      <Field
        label="Responsible researcher"
        name="researcherId"
        register={form.register}
        error={form.formState.errors.researcherId?.message}
      >
        <select
          id="researcherId"
          className="field-select"
          {...form.register("researcherId")}
          disabled={loadingOptions || researchers.length === 0}
        >
          <option value="">Select researcher</option>
          {researchers.map((researcher) => (
            <option
              key={researcher.researcher_id}
              value={researcher.researcher_id}
            >
              {researcher.full_name} · ID {researcher.researcher_id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Input sample"
        name="inputSampleId"
        register={form.register}
        error={form.formState.errors.inputSampleId?.message}
      >
        <select
          id="inputSampleId"
          className="field-select"
          {...form.register("inputSampleId")}
          disabled={loadingOptions || samples.length === 0}
        >
          <option value="">Select input sample</option>
          {samples.map((sample) => (
            <option key={sample.sample_id} value={sample.sample_id}>
              Sample {sample.sample_id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Output sample"
        name="outputSampleId"
        register={form.register}
        error={form.formState.errors.outputSampleId?.message}
      >
        <select
          id="outputSampleId"
          className="field-select"
          {...form.register("outputSampleId")}
          disabled={loadingOptions || samples.length === 0}
        >
          <option value="">Select output sample</option>
          {samples.map((sample) => (
            <option key={sample.sample_id} value={sample.sample_id}>
              Sample {sample.sample_id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Quantity"
        name="quantity"
        type="number"
        register={form.register}
      />

      <Field
        label="Unit"
        name="unit"
        register={form.register}
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

      {!loadingOptions && researchers.length === 0 && (
        <p className="field-error" role="alert">
          No researchers are available in the database.
        </p>
      )}

      {!loadingOptions && samples.length < 2 && (
        <p className="field-error" role="alert">
          At least two samples are needed to record a processing
          relationship.
        </p>
      )}
    </FormShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Experiment form                                                             */
/* -------------------------------------------------------------------------- */

export function ExperimentForm({
  close,
  done,
}: {
  close: () => void;
  done: (message: string) => void;
}) {
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [samples, setSamples] = useState<SampleOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const form = useForm<z.infer<typeof experimentSchema>>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      researcherId: "",
      name: "",
      type: "Library preparation",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      sampleId: "",
      status: "planned",
      description: "",
      notes: "",
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError("");

        const [researcherResponse, sampleResponse] =
          await Promise.all([
            fetch("/api/researchers", {
              credentials: "include",
              cache: "no-store",
            }),
            fetch("/api/samples", {
              credentials: "include",
              cache: "no-store",
            }),
          ]);

        const [researcherResult, sampleResult] =
          await Promise.all([
            readApiResponse(researcherResponse),
            readApiResponse(sampleResponse),
          ]);

        if (cancelled) return;

        setResearchers(researcherResult.researchers ?? []);
        setSamples(sampleResult.samples ?? []);

        if (researcherResult.researchers?.length) {
          form.setValue(
            "researcherId",
            String(researcherResult.researchers[0].researcher_id)
          );
        }

        if (sampleResult.samples?.length) {
          form.setValue(
            "sampleId",
            String(sampleResult.samples[0].sample_id)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setOptionsError(
            error instanceof Error
              ? error.message
              : "Could not load experiment options."
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
  }, [form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      setSubmitError("");

      const response = await fetch("/api/experiment-records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          experiment_name: values.name.trim(),
          experiment_type: values.type.trim(),
          start_date: values.startDate,
          end_date: values.endDate || null,
          researcher_id: Number(values.researcherId),
          status: values.status,
          description: values.description.trim() || null,
          sample_id: Number(values.sampleId),
          date_added: new Date().toISOString().slice(0, 10),
          notes: values.notes.trim() || null,
        }),
      });

      const result = await readApiResponse(response);

      const experimentId =
        result.experiment?.experiment_id ?? "new experiment";

      done(`Experiment ${experimentId} saved in PostgreSQL.`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Could not create the experiment."
      );
    }
  });

  return (
    <FormShell
      title="Create experiment"
      close={close}
      onSubmit={(event) => void submit(event)}
      submitLabel={
        form.formState.isSubmitting
          ? "Creating..."
          : "Create experiment"
      }
      subtitle="The experiment and its sample association are saved together."
    >
      {loadingOptions && (
        <p role="status">Loading researchers and samples...</p>
      )}

      {optionsError && (
        <p className="field-error" role="alert">
          {optionsError}
        </p>
      )}

      <Field
        label="Experiment name"
        name="name"
        register={form.register}
        error={form.formState.errors.name?.message}
      />

      <Field
        label="Experiment type"
        name="type"
        register={form.register}
        error={form.formState.errors.type?.message}
      />

      <Field
        label="Researcher"
        name="researcherId"
        register={form.register}
        error={form.formState.errors.researcherId?.message}
      >
        <select
          id="researcherId"
          className="field-select"
          {...form.register("researcherId")}
          disabled={loadingOptions || researchers.length === 0}
        >
          <option value="">Select researcher</option>
          {researchers.map((researcher) => (
            <option
              key={researcher.researcher_id}
              value={researcher.researcher_id}
            >
              {researcher.full_name} · ID {researcher.researcher_id}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Start date"
        name="startDate"
        type="date"
        register={form.register}
        error={form.formState.errors.startDate?.message}
      />

      <Field
        label="End date"
        name="endDate"
        type="date"
        register={form.register}
        error={form.formState.errors.endDate?.message}
      />

      <Field
        label="Associated sample"
        name="sampleId"
        register={form.register}
        error={form.formState.errors.sampleId?.message}
      >
        <select
          id="sampleId"
          className="field-select"
          {...form.register("sampleId")}
          disabled={loadingOptions || samples.length === 0}
        >
          <option value="">Select sample</option>
          {samples.map((sample) => (
            <option key={sample.sample_id} value={sample.sample_id}>
              Sample {sample.sample_id}
              {sample.sample_type_name
                ? ` · ${sample.sample_type_name}`
                : ""}
            </option>
          ))}
        </select>
      </Field>

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
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On hold</option>
        </select>
      </Field>

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

      <Field
        label="Sample association notes"
        name="notes"
        register={form.register}
      >
        <textarea
          id="notes"
          className="field-input"
          rows={3}
          {...form.register("notes")}
        />
      </Field>

      {submitError && (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      )}

      {!loadingOptions && researchers.length === 0 && (
        <p className="field-error" role="alert">
          No researchers are available in the database.
        </p>
      )}

      {!loadingOptions && samples.length === 0 && (
        <p className="field-error" role="alert">
          No samples are available in the database.
        </p>
      )}
    </FormShell>
  );
}
