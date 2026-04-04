'use client';

import { useState } from 'react';
import { FileCheck, FileText, BookOpen } from 'lucide-react';

interface PerformanceItem {
  name: string;
  type: 'quiz' | 'assignment';
  marksScored: number | null;
  totalMarks: number;
  status: 'completed' | 'pending' | 'submitted';
}

interface StudentPerformanceSummaryProps {
  totalQuizzes: number;
  totalAssignments: number;
  totalLectures: number;
  performanceItems: PerformanceItem[];
}

export default function StudentPerformanceSummary({
  totalQuizzes,
  totalAssignments,
  totalLectures,
  performanceItems
}: StudentPerformanceSummaryProps) {
  const [selectedView, setSelectedView] = useState<'quiz' | 'assignment'>('quiz');

  const quizItems = performanceItems.filter(item => item.type === 'quiz');
  const assignmentItems = performanceItems.filter(item => item.type === 'assignment');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <FileCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Quizzes</p>
              <p className="text-2xl font-bold text-foreground">{totalQuizzes}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold text-foreground">{totalAssignments}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Lectures</p>
              <p className="text-2xl font-bold text-foreground">{totalLectures}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground">Detailed Performance</h3>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setSelectedView('quiz')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedView === 'quiz'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCheck className="w-4 h-4 inline mr-2" />
              Quiz
            </button>
            <button
              onClick={() => setSelectedView('assignment')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedView === 'assignment'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Assignment
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Item</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Marks Scored</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Total Marks</th>
              </tr>
            </thead>
            <tbody>
              {(selectedView === 'quiz' ? quizItems : assignmentItems).map((item, index) => (
                <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-foreground">{item.name}</td>
                  <td className="py-3 px-4 text-sm text-foreground">
                    {item.marksScored !== null ? item.marksScored : '--'}
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground">{item.totalMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {(selectedView === 'quiz' ? quizItems : assignmentItems).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No {selectedView === 'quiz' ? 'quizzes' : 'assignments'} available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
