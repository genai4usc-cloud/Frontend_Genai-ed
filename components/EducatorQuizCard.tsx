'use client';

import { Calendar, Users, CircleCheck as CheckCircle, Clock, TrendingUp, TrendingDown, ListChecks, CreditCard as Edit, Trash2, Eye } from 'lucide-react';

interface EducatorQuizCardProps {
  quiz: {
    id: string;
    quiz_name: string;
    created_at: string;
    status: 'draft' | 'generated' | 'saved' | 'published';
    mcq_count: number;
    short_answer_count: number;
  };
  totalMarks: number;
  mockAnalytics?: {
    dueDate?: string;
    totalStudents: number;
    completed: number;
    pending: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    scoreDistribution: {
      excellent: number;
      good: number;
      fair: number;
      needsImprovement: number;
    };
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onClick?: () => void;
}

export default function EducatorQuizCard({
  quiz,
  totalMarks,
  mockAnalytics,
  onEdit,
  onDelete,
  onView,
  onClick
}: EducatorQuizCardProps) {
  const getStatusColor = () => {
    switch (quiz.status) {
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

  const completionRate = mockAnalytics
    ? (mockAnalytics.completed / mockAnalytics.totalStudents) * 100
    : 0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-purple-50 p-2 rounded-lg">
              <ListChecks className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{quiz.quiz_name || 'Untitled Quiz'}</h3>
              <div className="flex items-center gap-2 mt-1">
                {mockAnalytics?.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Due: {new Date(mockAnalytics.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
                  {quiz.status.charAt(0).toUpperCase() + quiz.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            {quiz.mcq_count > 0 && <span>{quiz.mcq_count} MCQ</span>}
            {quiz.mcq_count > 0 && quiz.short_answer_count > 0 && <span>•</span>}
            {quiz.short_answer_count > 0 && <span>{quiz.short_answer_count} Short Answer</span>}
            {(quiz.mcq_count > 0 || quiz.short_answer_count > 0) && <span>•</span>}
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

      {mockAnalytics && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Total</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{mockAnalytics.totalStudents}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Done</span>
              </div>
              <div className="text-lg font-bold text-green-600">{mockAnalytics.completed}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-orange-600 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending</span>
              </div>
              <div className="text-lg font-bold text-orange-600">{mockAnalytics.pending}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Avg</span>
              </div>
              <div className="text-lg font-bold text-purple-600">{mockAnalytics.avgScore}%</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>High</span>
              </div>
              <div className="text-lg font-bold text-blue-600">{mockAnalytics.highestScore}%</div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-semibold text-gray-900">{Math.round(completionRate)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-3">Score Distribution</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-600">90-100%</div>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${(mockAnalytics.scoreDistribution.excellent / mockAnalytics.totalStudents) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-right text-gray-900 font-medium">
                  {mockAnalytics.scoreDistribution.excellent} students
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-600">80-89%</div>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${(mockAnalytics.scoreDistribution.good / mockAnalytics.totalStudents) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-right text-gray-900 font-medium">
                  {mockAnalytics.scoreDistribution.good} students
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-600">70-79%</div>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-yellow-500 h-1.5 rounded-full"
                    style={{ width: `${(mockAnalytics.scoreDistribution.fair / mockAnalytics.totalStudents) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-right text-gray-900 font-medium">
                  {mockAnalytics.scoreDistribution.fair} students
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 text-xs text-gray-600">Below 70%</div>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-red-500 h-1.5 rounded-full"
                    style={{ width: `${(mockAnalytics.scoreDistribution.needsImprovement / mockAnalytics.totalStudents) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-right text-gray-900 font-medium">
                  {mockAnalytics.scoreDistribution.needsImprovement} students
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
