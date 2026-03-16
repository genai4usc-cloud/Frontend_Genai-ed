'use client';

import { Calendar, Users, CircleCheck as CheckCircle, Clock, TrendingUp, FileText } from 'lucide-react';

interface EducatorAssignmentCardProps {
  assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: 'active' | 'closed' | 'draft';
  };
  mockAnalytics: {
    totalStudents: number;
    submitted: number;
    graded: number;
    pending: number;
    avgScore: number;
  };
  onViewDetails?: () => void;
}

export default function EducatorAssignmentCard({
  assignment,
  mockAnalytics,
  onViewDetails
}: EducatorAssignmentCardProps) {
  const submissionProgress = (mockAnalytics.submitted / mockAnalytics.totalStudents) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'closed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'draft':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-50 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{assignment.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(assignment.status)}`}>
                  {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-brand-maroon hover:text-brand-maroon-hover border border-brand-maroon hover:bg-brand-maroon hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            View Details
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Total Students</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{mockAnalytics.totalStudents}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Submitted</span>
          </div>
          <div className="text-xl font-bold text-green-600">{mockAnalytics.submitted}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Graded</span>
          </div>
          <div className="text-xl font-bold text-blue-600">{mockAnalytics.graded}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-orange-600 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending</span>
          </div>
          <div className="text-xl font-bold text-orange-600">{mockAnalytics.pending}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Submission Progress</span>
          <span className="font-semibold text-gray-900">{Math.round(submissionProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-brand-maroon h-2 rounded-full transition-all"
            style={{ width: `${submissionProgress}%` }}
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600 pt-1">
          <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          <span>Avg Score: <span className="font-semibold text-purple-600">{mockAnalytics.avgScore}%</span></span>
        </div>
      </div>
    </div>
  );
}
