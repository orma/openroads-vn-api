-- Grab all tables from db and write to csvs.

\copy (SELECT * FROM admin_boundaries) to ./data/admin_boudaries.csv CSV HEADER
\copy (SELECT * FROM changesets) to ./data/changesets.csv CSV HEADER
\copy (SELECT * FROM current_way_nodes) to ./data/current_way_nodes.csv CSV HEADER
\copy (SELECT * FROM current_nodes) to ./data/current_nodes.csv CSV HEADER
\copy (SELECT * FROM current_way_tags) to ./data/current_way_tags.csv CSV HEADER
\copy (SELECT * FROM current_ways) to ./data/current_ways.csv CSV HEADER
\copy (SELECT * fROM users) to ./data/users.csv CSV HEADER
