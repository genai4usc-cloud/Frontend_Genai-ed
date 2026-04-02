'use client';

import { FileCheck, Calendar, Clock, Award, Eye, CirclePlay as PlayCircle, CircleCheck as CheckCircle } from 'lucide-react';

interface StudentQuizCardProps {
  title: string;
  courseName: string;
  instructorName: string;
  questionCount: number;
  totalMarks: number;
  duration: number;
  dueDate: string;
  status: 'upcoming' | 'available' | 'in_progress' | 'submitted' | 'grades_released' | 'closed';
  onViewQuestions: () => void;
  onStartQuiz?: () => void;
  onViewAttempt?: () => void;
}

export default function StudentQuizCard({
  title,
  courseName,
  instructorName,
  questionCount,
  totalMarks,
  duration,
  dueDate,
  status,
  onViewQuestions,
  onStartQuiz,
  onViewAttempt
}: StudentQuizCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'upcoming':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'available':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'submitted':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'grades_released':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'closed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'available':
        return 'Available';
      case 'in_progress':
        return 'In Progress';
      case 'submitted':
        return 'Submitted';
      case 'grades_released':
        return 'Grades Released';
      case 'closed':
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-5 h-5 text-brand-maroon" />
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
          <FileCheck className="w-4 h-4" />
          <span>{questionCount} Questions</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Award className="w-4 h-4" />
          <span>{totalMarks} Marks</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{duration} minutes</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Due: {new Date(dueDate).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-border">
        <button
          onClick={onViewQuestions}
          className="flex-1 border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-foreground font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Open Quiz
        </button>
        {status === 'available' && onStartQuiz && (
          <button
            onClick={onStartQuiz}
            className="flex-1 bg-brand-maroon hover:bg-brand-maroon-hover text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Start Quiz
          </button>
        )}
        {status === 'in_progress' && onViewAttempt && (
          <button
            onClick={onViewAttempt}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            Resume Quiz
          </button>
        )}
        {(status === 'submitted' || status === 'grades_released') && onViewAttempt && (
          <button
            onClick={onViewAttempt}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {status === 'grades_released' ? 'View Results' : 'View Status'}
          </button>
        )}
      </div>
    </div>
  );
}
