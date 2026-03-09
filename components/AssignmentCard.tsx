'use client';

import { FileText, Calendar, Clock, CreditCard as Edit, Trash2 } from 'lucide-react';

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
          <p className="text-gray-600 text-sm mb-2">{description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Due {new Date(dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{totalMarks} pts</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded hover:bg-gray-100"
              title="Edit assignment"
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
              title="Delete assignment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {totalStudents > 0 && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600">Submissions</span>
            <span className="font-semibold text-gray-900">
              {submissionCount} / {totalStudents}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-maroon h-1.5 rounded-full transition-all"
              style={{ width: `${(submissionCount / totalStudents) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
