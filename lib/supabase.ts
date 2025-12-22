import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'educator' | 'student';
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string;
  educator_id: string;
  code: string;
  title: string;
  description: string;
  student_count: number;
  created_at: string;
  updated_at: string;
};

export type Lecture = {
  id: string;
  course_id: string | null;
  educator_id: string;
  title: string;
  description: string;
  video_url: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
};
