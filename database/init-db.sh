#!/bin/bash
set -e

# Create secondary database for n8n workflow engine if it doesn't already exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE hospital_n8n'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'hospital_n8n')\gexec
EOSQL

