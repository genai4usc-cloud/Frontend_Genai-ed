'use client';

import { CreditCard as Edit, Trash2, Eye } from 'lucide-react';

interface QuizCardProps {
  title: string;
  status: 'draft' | 'generated' | 'saved' | 'published';
  totalMarks: number;
  mcqCount?: number;
  shortAnswerCount?: number;
  completionRate?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onClick?: () => void;
}

export default function QuizCard({
  title,
  status,
  totalMarks,
  mcqCount = 0,
  shortAnswerCount = 0,
  completionRate,
  onEdit,
  onDelete,
  onView,
  onClick
}: QuizCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'saved':
        return 'bg-blue-100 text-blue-700';
      case 'generated':
        return 'bg-purple-100 text-purple-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {mcqCount > 0 && <span>{mcqCount} MCQ</span>}
            {mcqCount > 0 && shortAnswerCount > 0 && <span>•</span>}
            {shortAnswerCount > 0 && <span>{shortAnswerCount} Short Answer</span>}
            {(mcqCount > 0 || shortAnswerCount > 0) && <span>•</span>}
            <span>{totalMarks} pts</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded hover:bg-gray-100"
              title="View quiz"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded hover:bg-gray-100"
              title="Edit quiz"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
              title="Delete quiz"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {completionRate !== undefined && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-semibold text-gray-900">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-maroon h-1.5 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
