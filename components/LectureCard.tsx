'use client';

import { useRouter } from 'next/navigation';
import { PlayCircle, Clock } from 'lucide-react';
import { Lecture } from '@/lib/supabase';

interface LectureCardProps {
  lecture: Lecture;
}

export default function LectureCard({ lecture }: LectureCardProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-[#990000] p-2 rounded-lg">
            <PlayCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{lecture.title}</h3>
            {lecture.description && (
              <p className="text-gray-600 text-sm line-clamp-2">{lecture.description}</p>
            )}
          </div>
        </div>
        {lecture.duration && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <Clock className="w-4 h-4" />
            <span>{lecture.duration} minutes</span>
          </div>
        )}
        <button
          onClick={() => {
            if (lecture.course_id) {
              router.push(`/educator/course/${lecture.course_id}/lecture/${lecture.id}`);
            } else {
              router.push(`/educator/lecture/${lecture.id}`);
            }
          }}
          className="w-full bg-[#FFCC00] hover:bg-[#EDB900] text-black font-bold py-3 rounded-lg transition-colors"
        >
          Open Lecture
        </button>
      </div>
    </div>
  );
}
