'use client';

import { FileText, Calendar, Clock, Edit, Trash2 } from 'lucide-react';

interface AssignmentCardProps {
  title: string;
  description: string;
  dueDate: string;
  status: 'active' | 'closed' | 'draft';
  totalMarks: number;
  submissionCount?: number;
  totalStudents?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export default function AssignmentCard({
  title,
  description,
  dueDate,
  status,
  totalMarks,
  submissionCount = 0,
  totalStudents = 0,
  onEdit,
  onDelete,
  onClick
}: AssignmentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      case 'draft':
        return 'bg-blue-100 text-blue-700';
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
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 text-sm mb-3">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
              title="Edit assignment"
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
              title="Delete assignment"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{totalMarks} marks</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {totalStudents > 0 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Submissions</span>
            <span className="font-bold text-gray-900">
              {submissionCount} / {totalStudents}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-brand-maroon h-2 rounded-full transition-all"
              style={{ width: `${(submissionCount / totalStudents) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
