--
-- Name: vpromms; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TYPE vpromms_level AS ENUM ('nation', 'provine', 'district', 'commmune', 'village', 'rural', 'special' );

CREATE TABLE vpromms (
  id text PRIMARY KEY,
  type vpromms_level NOT NULL,
  p_code int,
  d_code text NOT NULL
);

CREATE INDEX vpromms_idx ON vpromms USING btree (id);