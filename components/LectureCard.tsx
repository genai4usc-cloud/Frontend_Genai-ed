'use client';

import { PlayCircle, Clock, Loader2 } from 'lucide-react';

interface LectureCardProps {
  title: string;
  courseCode?: string;
  instructorName?: string;
  duration?: number;
  createdAt?: string;
  isNew?: boolean;
  status?: string;
  isEducatorLecture?: boolean;
  onClick: () => void;
}

export default function LectureCard({
  title,
  courseCode,
  instructorName,
  duration,
  createdAt,
  isNew = false,
  status,
  isEducatorLecture = false,
  onClick
}: LectureCardProps) {
  const getStatusBadge = () => {
    if (status === 'generating') {
      return (
        <span className="px-2 py-1 bg-brand-yellow text-brand-maroon text-xs font-bold rounded-full flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Generating
        </span>
      );
    }
    if (isEducatorLecture) {
      return (
        <span className="px-2 py-1 bg-brand-maroon text-white text-xs font-bold rounded-full">
          Educator
        </span>
      );
    }
    if (isNew) {
      return (
        <span className="px-2 py-1 bg-brand-yellow text-brand-maroon text-xs font-bold rounded-full">
          NEW
        </span>
      );
    }
    return null;
  };

  const thumbnailEmojis = ['🧠', '💭', '🗣️', '📚', '✨', '💡'];
  const randomEmoji = thumbnailEmojis[Math.floor(Math.random() * thumbnailEmojis.length)];

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="bg-gradient-to-br from-brand-maroon to-brand-maroon-hover h-40 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform">
        {randomEmoji}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-foreground line-clamp-2 flex-1">{title}</h3>
          {getStatusBadge()}
        </div>
        {(courseCode || instructorName) && (
          <p className="text-sm text-muted-foreground mb-2">
            {courseCode && <span>{courseCode}</span>}
            {courseCode && instructorName && <span> • </span>}
            {instructorName && <span>{instructorName}</span>}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {duration !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{duration} min</span>
            </div>
          )}
          {createdAt && <span>{createdAt}</span>}
        </div>
      </div>
    </div>
  );
}
