'use client';

import { Award, FileCheck, Video, FileText, TrendingUp } from 'lucide-react';

interface PerformanceItem {
  name: string;
  type: 'quiz' | 'assignment';
  marksScored: number | null;
  totalMarks: number;
  status: 'completed' | 'pending' | 'submitted';
}

interface StudentPerformanceSummaryProps {
  averageQuizScore: number;
  averageAssignmentScore: number;
  completedLectures: number;
  totalLectures: number;
  submittedAssignments: number;
  totalAssignments: number;
  performanceItems: PerformanceItem[];
}

export default function StudentPerformanceSummary({
  averageQuizScore,
  averageAssignmentScore,
  completedLectures,
  totalLectures,
  submittedAssignments,
  totalAssignments,
  performanceItems
}: StudentPerformanceSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <FileCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Quiz Score</p>
              <p className="text-2xl font-bold text-foreground">{averageQuizScore}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{ width: `${averageQuizScore}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Assignment Score</p>
              <p className="text-2xl font-bold text-foreground">{averageAssignmentScore}%</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${averageAssignmentScore}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
              <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lectures Completed</p>
              <p className="text-2xl font-bold text-foreground">
                {completedLectures} / {totalLectures}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all"
              style={{ width: `${(completedLectures / totalLectures) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assignments Submitted</p>
              <p className="text-2xl font-bold text-foreground">
                {submittedAssignments} / {totalAssignments}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all"
              style={{ width: `${(submittedAssignments / totalAssignments) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Detailed Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Item</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Marks Scored</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Total Marks</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {performanceItems.map((item, index) => (
                <tr key={index} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4 text-sm text-foreground">{item.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.type === 'quiz'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground">
                    {item.marksScored !== null ? item.marksScored : '--'}
                  </td>
                  <td className="py-3 px-4 text-sm text-foreground">{item.totalMarks}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : item.status === 'submitted'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
