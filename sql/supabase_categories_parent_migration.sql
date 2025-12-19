-- Migration: Add parent category support to categories
-- This migration adds a parent_id column and is_parent_category flag to support hierarchical categories
-- Parent categories (is_parent_category = true) can't hold money directly - they only show the sum of their children
-- Only categories marked as parent categories can have children

-- Step 1: Add is_parent_category column (defaults to false)
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_parent_category BOOLEAN DEFAULT false NOT NULL;

-- Ensure existing rows have the default value (only if column exists and has NULLs)
-- This handles cases where the column was added without a default in a previous partial migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' 
    AND column_name = 'is_parent_category'
  ) THEN
    UPDATE categories
    SET is_parent_category = false
    WHERE is_parent_category IS NULL;
  END IF;
END $$;

-- Step 2: Add parent_id column
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Step 3: Create index on parent_id for faster queries
CREATE INDEX IF NOT EXISTS categories_parent_id_idx ON categories(parent_id);

-- Step 4: Create index on is_parent_category for faster queries
CREATE INDEX IF NOT EXISTS categories_is_parent_category_idx ON categories(is_parent_category);

-- Step 5: Add constraint to prevent circular references (a category cannot be its own parent)
-- Drop if exists first to avoid errors on re-run
ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_no_self_parent;
ALTER TABLE categories
  ADD CONSTRAINT categories_no_self_parent CHECK (parent_id IS NULL OR parent_id != id);

-- Step 6: Add constraint to ensure only parent categories can have children
-- (This is enforced at application level, but we document it here)
-- A category with children must have is_parent_category = true

-- Step 7: Add comments explaining the parent category system
COMMENT ON COLUMN categories.is_parent_category IS 'True if this category is a parent category. Parent categories cannot hold money directly - they only display the sum of their children''s funds. Only parent categories can have children.';
COMMENT ON COLUMN categories.parent_id IS 'Reference to parent category. NULL means this is a top-level category. Only categories with is_parent_category = true can be parents.';

