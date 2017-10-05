FROM mdillon/postgis:9.6-alpine
# additional libs needed for wget
RUN apk update && apk add ca-certificates wget && update-ca-certificates   
# make needed directories. 
# the first is for adding tables and sql data
# the second is for housing csvs downed from s3 
# the third is for the script that downs the csvs from s3.
RUN mkdir -p /docker-entrypoint-initdb.d
RUN mkdir -p /init
RUN mkdir -p /seed
# Initialize the database using all SQL commands in the directory
ADD run-seed.sh /seed/
RUN sh /seed/run-seed.sh
ADD sql/*.sql /docker-entrypoint-initdb.d/
