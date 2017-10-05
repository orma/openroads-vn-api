# Openroads db

### directory metadata

#### `./sql`: a folder with sql files to build db schema and add data to the db.

There are a number of files that add schema to the db as. The only file that inserts data into the db is the `populate-db.sql` file. Currently, this file only adds data to the `admin_boundaries` table. More table data can be extended by adding statements below the one currently in the file of spec:

```sql
COPY ${table_name} FROM '/path/to/${table_name}.csv' DELIMITER ',' CSV HEADER;
```

...make sure that this new data is additionally in the correct s3 bucket so that it is copied into the image when it is built. To do so first zip up all CSVs to add in a `fixture.zip` file. Then, copy them to the `openroads-vn-fixture` bucket. 


```
zip ./fixture.zip ./dir-with-data \
aws s3 cp ./fixture.zip s3://openroads-vn-fixture/
```

#### `./dump`: includes a `dump.sql` file that will dump tables to csv files to a `./data` folder. 

This is effectively boilerpate to get data from a prod. db so it can be added into this database via the workflow mentioned above.

#### `./Dockerfile`: the docker file that builds the database image. 

The image first build pulls fixture data located in s3 via the `run-seed.sh` script, then adds the sql files to an `docker-entrypoint-initdb.d` folder. This folder is standard to the official docker [postgres image](https://hub.docker.com/_/postgres/) (the image ths Dockerfile's PostGIS image is built from) to add schema and data to a database.

#### `./run-seed.sh` the shell script that downloads the fixture CSV files from s3 during the image build. 

These CSVs, after being added to image, are *copied* into the database when db container is run.