'use client';

import { Users, Video, FileText, FileCheck, Award, TrendingUp, Clock } from 'lucide-react';

interface TopStudent {
  name: string;
  score: number;
  email: string;
}

interface SummaryStatsProps {
  totalStudents: number;
  lectureCompletionRate: number;
  assignmentSubmissionRate: number;
  quizCompletionRate: number;
  averageOverallMarks: number;
  averageAssignmentScore: number;
  averageQuizScore: number;
  pendingAssignments: number;
  pendingQuizzes: number;
  topStudents: TopStudent[];
}

export default function CourseSummaryStats({
  totalStudents,
  lectureCompletionRate,
  assignmentSubmissionRate,
  quizCompletionRate,
  averageOverallMarks,
  averageAssignmentScore,
  averageQuizScore,
  pendingAssignments,
  pendingQuizzes,
  topStudents
}: SummaryStatsProps) {
  const statCards = [
    {
      icon: Users,
      label: 'Total Students',
      value: totalStudents,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Video,
      label: 'Lecture Completion',
      value: `${lectureCompletionRate}%`,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      icon: FileText,
      label: 'Assignment Submission',
      value: `${assignmentSubmissionRate}%`,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      icon: FileCheck,
      label: 'Quiz Completion',
      value: `${quizCompletionRate}%`,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50'
    }
  ];

  const performanceCards = [
    {
      icon: Award,
      label: 'Average Overall',
      value: `${averageOverallMarks}%`,
      color: 'bg-brand-maroon',
      bgColor: 'bg-red-50'
    },
    {
      icon: FileText,
      label: 'Avg Assignment Score',
      value: `${averageAssignmentScore}%`,
      color: 'bg-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: FileCheck,
      label: 'Avg Quiz Score',
      value: `${averageQuizScore}%`,
      color: 'bg-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Enrollment & Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-5 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {performanceCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl p-5 border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {(pendingAssignments > 0 || pendingQuizzes > 0) && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Pending Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAssignments > 0 && (
              <div className="bg-white rounded-xl p-5 border border-yellow-300">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Pending Assignments</p>
                    <p className="text-xl font-bold text-gray-900">{pendingAssignments}</p>
                  </div>
                </div>
              </div>
            )}
            {pendingQuizzes > 0 && (
              <div className="bg-white rounded-xl p-5 border border-yellow-300">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Pending Quizzes</p>
                    <p className="text-xl font-bold text-gray-900">{pendingQuizzes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {topStudents.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">
                    Rank
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">
                    Student
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topStudents.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {index === 0 && (
                          <span className="text-xl mr-2">🥇</span>
                        )}
                        {index === 1 && (
                          <span className="text-xl mr-2">🥈</span>
                        )}
                        {index === 2 && (
                          <span className="text-xl mr-2">🥉</span>
                        )}
                        {index > 2 && (
                          <span className="text-sm font-medium text-gray-900 ml-2">
                            {index + 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{student.name}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{student.email}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-brand-maroon">{student.score}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
