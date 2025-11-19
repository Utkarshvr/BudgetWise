-- Migration to add category_id to transactions table
-- Run this after creating the categories table

-- Step 1: Add category_id column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Step 2: Create index on category_id for faster queries
CREATE INDEX IF NOT EXISTS transactions_category_id_idx ON transactions(category_id);

-- Note: category_id is optional (nullable) so transactions can exist without a category
-- The foreign key constraint ensures referential integrity
-- ON DELETE SET NULL ensures that if a category is deleted, transactions are not deleted,
-- but their category_id is set to NULL

