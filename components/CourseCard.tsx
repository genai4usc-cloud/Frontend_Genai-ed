'use client';

import { Users, GraduationCap } from 'lucide-react';

interface CourseCardProps {
  code: string;
  title: string;
  instructorName?: string;
  semester?: string;
  studentCount?: number;
  newLecturesCount?: number;
  onClick: () => void;
}

export default function CourseCard({
  code,
  title,
  instructorName,
  semester,
  studentCount,
  newLecturesCount,
  onClick
}: CourseCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-maroon p-3 rounded-xl group-hover:scale-110 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="inline-block bg-brand-yellow text-brand-maroon text-xs font-bold px-3 py-1 rounded-full">
              {code}
            </span>
          </div>
        </div>
        {newLecturesCount !== undefined && newLecturesCount > 0 && (
          <span className="px-3 py-1 bg-brand-yellow text-brand-maroon text-xs font-bold rounded-full">
            {newLecturesCount} new
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{title}</h3>

      <div className="space-y-2 text-sm text-muted-foreground">
        {instructorName && (
          <p>{instructorName}</p>
        )}
        {semester && (
          <p>{semester}</p>
        )}
        {studentCount !== undefined && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{studentCount} students</span>
          </div>
        )}
      </div>
    </div>
  );
}
