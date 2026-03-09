'use client';

import { FileCheck, Calendar, Clock, Award, CreditCard as Edit, Trash2, Eye } from 'lucide-react';

interface QuizCardProps {
  title: string;
  createdAt: string;
  status: 'draft' | 'generated' | 'saved' | 'published';
  duration?: number;
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
  createdAt,
  status,
  duration,
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
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-brand-maroon p-2 rounded-lg">
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {mcqCount > 0 && <span>{mcqCount} MCQ</span>}
            {mcqCount > 0 && shortAnswerCount > 0 && <span>•</span>}
            {shortAnswerCount > 0 && <span>{shortAnswerCount} Short Answer</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="text-gray-400 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-green-50"
              title="View quiz"
            >
              <Eye className="w-5 h-5" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
              title="Edit quiz"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
              title="Delete quiz"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{new Date(createdAt).toLocaleDateString()}</span>
        </div>
        {duration && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{duration} min</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Award className="w-4 h-4" />
          <span>{totalMarks} marks</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {completionRate !== undefined && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-bold text-gray-900">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-brand-maroon h-2 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
