'use client';

import { FileText, Calendar, Award, Eye, Upload, CheckCircle, Clock } from 'lucide-react';

interface StudentAssignmentCardProps {
  title: string;
  courseName: string;
  instructorName: string;
  dueDate: string;
  totalMarks: number;
  status: 'submitted' | 'pending' | 'late';
  onViewAssignment: () => void;
  onSubmitWork?: () => void;
  onViewSubmission?: () => void;
}

export default function StudentAssignmentCard({
  title,
  courseName,
  instructorName,
  dueDate,
  totalMarks,
  status,
  onViewAssignment,
  onSubmitWork,
  onViewSubmission
}: StudentAssignmentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'submitted':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'late':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'pending':
        return 'Pending';
      case 'late':
        return 'Late';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-brand-maroon" />
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-1">{courseName}</p>
          <p className="text-xs text-muted-foreground">Instructor: {instructorName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
          {getStatusLabel()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="w-4 h-4" />
          <span>{totalMarks} Marks</span>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-border">
        <button
          onClick={onViewAssignment}
          className="flex-1 border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-foreground font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Assignment
        </button>
        {status === 'pending' && onSubmitWork && (
          <button
            onClick={onSubmitWork}
            className="flex-1 bg-brand-maroon hover:bg-brand-maroon-hover text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Submit Work
          </button>
        )}
        {status === 'submitted' && onViewSubmission && (
          <button
            onClick={onViewSubmission}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            View Submission
          </button>
        )}
      </div>
    </div>
  );
}
