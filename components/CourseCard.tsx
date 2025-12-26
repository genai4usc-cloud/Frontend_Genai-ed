'use client';

import { useRouter } from 'next/navigation';
import { Users, PlayCircle } from 'lucide-react';
import { Course } from '@/lib/supabase';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="mb-4">
          <span className="inline-block bg-brand-maroon text-white text-xs font-bold px-3 py-1 rounded-full">
            {course.code}
          </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
        {course.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{course.student_count} students</span>
          </div>
        </div>
        <button
          onClick={() => router.push(`/educator/course/${course.id}`)}
          className="w-full bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold py-3 rounded-lg transition-colors"
        >
          Manage Course
        </button>
      </div>
    </div>
  );
}
