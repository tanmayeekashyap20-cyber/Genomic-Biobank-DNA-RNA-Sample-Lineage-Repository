--
-- PostgreSQL database dump
--

\restrict XB3tYAc7oVxsULMdYIwTnpje7iO6OcY6q1ltm3nrqWBRuMY5VypBpdd6c328tmr

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: log_sample_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_sample_update() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO public.audit_log
        (action, table_name, record_id, details)
    VALUES
        ('UPDATE', 'sample', NEW.sample_id,
         jsonb_build_object(
             'old_status', OLD.status,
             'new_status', NEW.status
         )::text);

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_user (
    user_id bigint NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255),
    password_hash text NOT NULL,
    role_id bigint NOT NULL,
    researcher_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: app_user_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.app_user ALTER COLUMN user_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.app_user_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    audit_id bigint NOT NULL,
    user_id bigint,
    action character varying(100) NOT NULL,
    table_name character varying(100),
    record_id bigint,
    action_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details text
);


--
-- Name: audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ALTER COLUMN audit_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: consent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consent (
    consent_id bigint NOT NULL,
    donor_id bigint NOT NULL,
    consent_type character varying(100) NOT NULL,
    consent_date date NOT NULL,
    expiry_date date,
    status character varying(30) NOT NULL,
    description text,
    CONSTRAINT consent_check CHECK (((expiry_date IS NULL) OR (expiry_date >= consent_date)))
);


--
-- Name: consent_consent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.consent ALTER COLUMN consent_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.consent_consent_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: donor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor (
    donor_id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    date_of_birth date,
    gender character varying(30),
    phone_number character varying(20),
    email character varying(255),
    address text,
    registration_date date DEFAULT CURRENT_DATE NOT NULL
);


--
-- Name: donor_donor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.donor ALTER COLUMN donor_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.donor_donor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: experiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiment (
    experiment_id bigint NOT NULL,
    experiment_name character varying(150) NOT NULL,
    experiment_type character varying(100),
    start_date date,
    end_date date,
    researcher_id bigint NOT NULL,
    status character varying(30) DEFAULT 'planned'::character varying NOT NULL,
    description text,
    CONSTRAINT experiment_check CHECK (((start_date IS NULL) OR (end_date IS NULL) OR (end_date >= start_date)))
);


--
-- Name: experiment_experiment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.experiment ALTER COLUMN experiment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.experiment_experiment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: experiment_sample; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.experiment_sample (
    experiment_sample_id bigint NOT NULL,
    experiment_id bigint NOT NULL,
    sample_id bigint NOT NULL,
    date_added date DEFAULT CURRENT_DATE NOT NULL,
    notes text
);


--
-- Name: experiment_sample_experiment_sample_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.experiment_sample ALTER COLUMN experiment_sample_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.experiment_sample_experiment_sample_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: process; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process (
    process_id bigint NOT NULL,
    process_type character varying(100) NOT NULL,
    process_date date NOT NULL,
    performed_by bigint NOT NULL,
    description text
);


--
-- Name: process_process_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.process ALTER COLUMN process_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.process_process_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: researcher; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.researcher (
    researcher_id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    department character varying(100),
    role character varying(100),
    email character varying(255),
    phone character varying(20)
);


--
-- Name: researcher_researcher_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.researcher ALTER COLUMN researcher_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.researcher_researcher_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    role_id bigint NOT NULL,
    role_name character varying(50) NOT NULL,
    description text
);


--
-- Name: role_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.role ALTER COLUMN role_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.role_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sample; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample (
    sample_id bigint NOT NULL,
    donor_id bigint NOT NULL,
    sample_type_id bigint NOT NULL,
    collection_date date NOT NULL,
    collection_location character varying(255),
    status character varying(30) DEFAULT 'collected'::character varying NOT NULL,
    description text
);


--
-- Name: sample_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_type (
    sample_type_id bigint NOT NULL,
    sample_type_name character varying(50) NOT NULL,
    description text
);


--
-- Name: sample_inventory_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sample_inventory_view AS
 SELECT s.sample_id,
    d.full_name AS donor_name,
    st.sample_type_name,
    s.collection_date,
    s.status
   FROM ((public.sample s
     JOIN public.donor d ON ((d.donor_id = s.donor_id)))
     JOIN public.sample_type st ON ((st.sample_type_id = s.sample_type_id)));


--
-- Name: sample_lineage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_lineage (
    lineage_id bigint NOT NULL,
    parent_sample_id bigint NOT NULL,
    child_sample_id bigint NOT NULL,
    relationship_type character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    CONSTRAINT sample_lineage_check CHECK ((parent_sample_id <> child_sample_id))
);


--
-- Name: sample_lineage_lineage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sample_lineage ALTER COLUMN lineage_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sample_lineage_lineage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sample_process; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_process (
    sample_process_id bigint NOT NULL,
    process_id bigint NOT NULL,
    input_sample_id bigint NOT NULL,
    output_sample_id bigint NOT NULL,
    quantity numeric(12,3),
    unit character varying(30),
    CONSTRAINT sample_process_check CHECK ((input_sample_id <> output_sample_id)),
    CONSTRAINT sample_process_quantity_check CHECK (((quantity IS NULL) OR (quantity >= (0)::numeric)))
);


--
-- Name: sample_process_sample_process_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sample_process ALTER COLUMN sample_process_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sample_process_sample_process_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sample_sample_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sample ALTER COLUMN sample_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sample_sample_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sample_storage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sample_storage (
    sample_storage_id bigint NOT NULL,
    sample_id bigint NOT NULL,
    storage_id bigint NOT NULL,
    stored_date date DEFAULT CURRENT_DATE NOT NULL,
    removed_date date,
    CONSTRAINT sample_storage_check CHECK (((removed_date IS NULL) OR (removed_date >= stored_date)))
);


--
-- Name: sample_storage_sample_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sample_storage ALTER COLUMN sample_storage_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sample_storage_sample_storage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sample_type_sample_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sample_type ALTER COLUMN sample_type_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sample_type_sample_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sequencing_result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequencing_result (
    sequencing_result_id bigint NOT NULL,
    sample_id bigint NOT NULL,
    experiment_id bigint,
    sequencing_platform character varying(100),
    run_date date,
    file_path text,
    result_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    notes text
);


--
-- Name: sequencing_result_sequencing_result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sequencing_result ALTER COLUMN sequencing_result_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sequencing_result_sequencing_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: storage_unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_unit (
    storage_id bigint NOT NULL,
    freezer_id character varying(50),
    rack_no character varying(50),
    box_no character varying(50),
    "position" character varying(50),
    temperature numeric(5,2),
    status character varying(30) DEFAULT 'available'::character varying NOT NULL
);


--
-- Name: storage_unit_storage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.storage_unit ALTER COLUMN storage_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.storage_unit_storage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_user app_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_email_key UNIQUE (email);


--
-- Name: app_user app_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (user_id);


--
-- Name: app_user app_user_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_username_key UNIQUE (username);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: consent consent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent
    ADD CONSTRAINT consent_pkey PRIMARY KEY (consent_id);


--
-- Name: donor donor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor
    ADD CONSTRAINT donor_pkey PRIMARY KEY (donor_id);


--
-- Name: experiment experiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment
    ADD CONSTRAINT experiment_pkey PRIMARY KEY (experiment_id);


--
-- Name: experiment_sample experiment_sample_experiment_id_sample_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_sample
    ADD CONSTRAINT experiment_sample_experiment_id_sample_id_key UNIQUE (experiment_id, sample_id);


--
-- Name: experiment_sample experiment_sample_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_sample
    ADD CONSTRAINT experiment_sample_pkey PRIMARY KEY (experiment_sample_id);


--
-- Name: process process_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process
    ADD CONSTRAINT process_pkey PRIMARY KEY (process_id);


--
-- Name: researcher researcher_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researcher
    ADD CONSTRAINT researcher_email_key UNIQUE (email);


--
-- Name: researcher researcher_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researcher
    ADD CONSTRAINT researcher_pkey PRIMARY KEY (researcher_id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (role_id);


--
-- Name: role role_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_name_key UNIQUE (role_name);


--
-- Name: sample_lineage sample_lineage_parent_sample_id_child_sample_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_lineage
    ADD CONSTRAINT sample_lineage_parent_sample_id_child_sample_id_key UNIQUE (parent_sample_id, child_sample_id);


--
-- Name: sample_lineage sample_lineage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_lineage
    ADD CONSTRAINT sample_lineage_pkey PRIMARY KEY (lineage_id);


--
-- Name: sample sample_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample
    ADD CONSTRAINT sample_pkey PRIMARY KEY (sample_id);


--
-- Name: sample_process sample_process_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_process
    ADD CONSTRAINT sample_process_pkey PRIMARY KEY (sample_process_id);


--
-- Name: sample_storage sample_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_storage
    ADD CONSTRAINT sample_storage_pkey PRIMARY KEY (sample_storage_id);


--
-- Name: sample_type sample_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_type
    ADD CONSTRAINT sample_type_pkey PRIMARY KEY (sample_type_id);


--
-- Name: sample_type sample_type_sample_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_type
    ADD CONSTRAINT sample_type_sample_type_name_key UNIQUE (sample_type_name);


--
-- Name: sequencing_result sequencing_result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequencing_result
    ADD CONSTRAINT sequencing_result_pkey PRIMARY KEY (sequencing_result_id);


--
-- Name: storage_unit storage_unit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_unit
    ADD CONSTRAINT storage_unit_pkey PRIMARY KEY (storage_id);


--
-- Name: idx_sample_donor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sample_donor_id ON public.sample USING btree (donor_id);


--
-- Name: sample sample_update_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sample_update_audit_trigger AFTER UPDATE ON public.sample FOR EACH ROW EXECUTE FUNCTION public.log_sample_update();


--
-- Name: app_user app_user_researcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_researcher_id_fkey FOREIGN KEY (researcher_id) REFERENCES public.researcher(researcher_id);


--
-- Name: app_user app_user_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_user
    ADD CONSTRAINT app_user_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_user(user_id);


--
-- Name: consent consent_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consent
    ADD CONSTRAINT consent_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donor(donor_id);


--
-- Name: experiment experiment_researcher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment
    ADD CONSTRAINT experiment_researcher_id_fkey FOREIGN KEY (researcher_id) REFERENCES public.researcher(researcher_id);


--
-- Name: experiment_sample experiment_sample_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_sample
    ADD CONSTRAINT experiment_sample_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiment(experiment_id);


--
-- Name: experiment_sample experiment_sample_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.experiment_sample
    ADD CONSTRAINT experiment_sample_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.sample(sample_id);


--
-- Name: process process_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process
    ADD CONSTRAINT process_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.researcher(researcher_id);


--
-- Name: sample sample_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample
    ADD CONSTRAINT sample_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donor(donor_id);


--
-- Name: sample_lineage sample_lineage_child_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_lineage
    ADD CONSTRAINT sample_lineage_child_sample_id_fkey FOREIGN KEY (child_sample_id) REFERENCES public.sample(sample_id);


--
-- Name: sample_lineage sample_lineage_parent_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_lineage
    ADD CONSTRAINT sample_lineage_parent_sample_id_fkey FOREIGN KEY (parent_sample_id) REFERENCES public.sample(sample_id);


--
-- Name: sample_process sample_process_input_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_process
    ADD CONSTRAINT sample_process_input_sample_id_fkey FOREIGN KEY (input_sample_id) REFERENCES public.sample(sample_id);


--
-- Name: sample_process sample_process_output_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_process
    ADD CONSTRAINT sample_process_output_sample_id_fkey FOREIGN KEY (output_sample_id) REFERENCES public.sample(sample_id);


--
-- Name: sample_process sample_process_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_process
    ADD CONSTRAINT sample_process_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.process(process_id);


--
-- Name: sample sample_sample_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample
    ADD CONSTRAINT sample_sample_type_id_fkey FOREIGN KEY (sample_type_id) REFERENCES public.sample_type(sample_type_id);


--
-- Name: sample_storage sample_storage_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_storage
    ADD CONSTRAINT sample_storage_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.sample(sample_id);


--
-- Name: sample_storage sample_storage_storage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sample_storage
    ADD CONSTRAINT sample_storage_storage_id_fkey FOREIGN KEY (storage_id) REFERENCES public.storage_unit(storage_id);


--
-- Name: sequencing_result sequencing_result_experiment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequencing_result
    ADD CONSTRAINT sequencing_result_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.experiment(experiment_id);


--
-- Name: sequencing_result sequencing_result_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequencing_result
    ADD CONSTRAINT sequencing_result_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.sample(sample_id);


--
-- PostgreSQL database dump complete
--

\unrestrict XB3tYAc7oVxsULMdYIwTnpje7iO6OcY6q1ltm3nrqWBRuMY5VypBpdd6c328tmr

