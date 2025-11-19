-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  background_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);

-- Create index on name for faster searches
CREATE INDEX IF NOT EXISTS categories_name_idx ON categories(name);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own categories
CREATE POLICY "Users can view their own categories"
  ON categories
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own categories
CREATE POLICY "Users can insert their own categories"
  ON categories
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own categories
CREATE POLICY "Users can update their own categories"
  ON categories
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own categories
CREATE POLICY "Users can delete their own categories"
  ON categories
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at
-- Note: This function should already exist from accounts schema, but we'll reference it
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

