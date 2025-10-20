-- Fix PostgreSQL user permissions
-- Run this as postgres superuser

-- Grant login permission to ecom_user
ALTER USER ecom_user LOGIN;

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE ecom_dev TO ecom_user;

-- Grant privileges on the public schema
GRANT ALL ON SCHEMA public TO ecom_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ecom_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ecom_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ecom_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ecom_user;


