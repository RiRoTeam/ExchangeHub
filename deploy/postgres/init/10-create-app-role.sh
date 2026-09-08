#!/bin/sh
# The official image sources non-executable *.sh init files. Keep nounset local
# concerns explicit instead of changing the parent entrypoint's shell options.
set -e

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${DB_APP_USER:?DB_APP_USER is required}"
: "${DB_APP_PASSWORD_FILE:?DB_APP_PASSWORD_FILE is required}"

if [ "$DB_APP_USER" = "$POSTGRES_USER" ]; then
    echo "DB_APP_USER must differ from the PostgreSQL bootstrap administrator" >&2
    exit 1
fi

if [ ! -s "$DB_APP_PASSWORD_FILE" ]; then
    echo "DB application password secret is missing or empty" >&2
    exit 1
fi

app_password=$(tr -d '\r\n' < "$DB_APP_PASSWORD_FILE")

if [ -z "$app_password" ]; then
    echo "DB application password secret is empty" >&2
    exit 1
fi

# This script is executed only by the official PostgreSQL image while creating
# a brand-new data directory. The application role owns its database (so Flyway
# can manage the schema) but has no cluster-wide administrative privileges.
psql --set=ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=app_user="$DB_APP_USER" \
    --set=app_password="$app_password" \
    --set=db_name="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"app_user"
    WITH LOGIN
    PASSWORD :'app_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION;

ALTER ROLE :"app_user" SET timezone TO 'UTC';
ALTER DATABASE :"db_name" OWNER TO :"app_user";
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE :"db_name" TO :"app_user";
SQL

unset app_password
