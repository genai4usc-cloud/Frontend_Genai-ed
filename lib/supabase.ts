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
  semester: string;
  section: string;
  instructor_name: string;
  syllabus_url: string | null;
  course_materials_urls: string[];
  background_materials_urls: string[];
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

export type CourseTeachingAssistant = {
  id: string;
  course_id: string;
  email: string;
  created_at: string;
};

export type CourseStudent = {
  id: string;
  course_id: string;
  email: string;
  created_at: string;
};

export type CourseTextbook = {
  id: string;
  course_id: string;
  title_isbn: string;
  created_at: string;
};
