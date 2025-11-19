export interface Category {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  background_color: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryFormData {
  name: string;
  emoji: string;
  background_color: string;
}

