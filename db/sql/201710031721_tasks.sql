--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -; Tablespace:
--

CREATE TABLE tasks (
	way_id int,
        neighbors text[],
	pending BOOLEAN DEFAULT FALSE
);

ALTER TABLE tasks ADD COLUMN id SERIAL PRIMARY KEY;
CREATE INDEX tasks_task_idx ON tasks USING btree (id);
CREATE INDEX tasks_way_idx ON tasks USING btree (way_id);
