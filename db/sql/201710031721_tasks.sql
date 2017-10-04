--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE tasks (
	id text PRIMARY KEY,
	way_id int REFERENCES current_ways,
        neighbors text[]
	pending boolean DEFAULT FALSE
);

CREATE INDEX tasks_task_idx ON tasks USING btree (id);
CREATE INDEX tasks_way_idx ON tasks USING btree (way_id);
