-- Migration: Add file_url column to media table if it doesn't exist
-- This ensures media records have a proper URL field for accessing files

-- Add file_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'media' AND column_name = 'file_url'
    ) THEN
        ALTER TABLE media ADD COLUMN file_url VARCHAR(500);

        -- Update existing records to generate file_url from file_path
        UPDATE media
        SET file_url = CONCAT('/uploads/', file_path)
        WHERE file_url IS NULL;

        -- Make file_url NOT NULL after populating existing records
        ALTER TABLE media ALTER COLUMN file_url SET NOT NULL;

        RAISE NOTICE 'Added file_url column to media table';
    ELSE
        RAISE NOTICE 'file_url column already exists';
    END IF;
END $$;
