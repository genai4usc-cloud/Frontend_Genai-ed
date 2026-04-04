'use client';

import { useMemo, useState } from 'react';
import { Search, Upload, ChartBar as BarChart3, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import StudentMacroView from './StudentMacroView';
import AIClassInsights, { InsightProps } from './AIClassInsights';

export type StudentPerformanceRow = {
  courseStudentId: string;
  studentId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  assignmentsSubmitted: number;
  assignmentsTotal: number;
  assignmentsAvg: number | null;
  quizzesCompleted: number;
  quizzesTotal: number;
  quizzesAvg: number | null;
  lecturesCompleted: number;
  lecturesTotal: number;
};

type Props = {
  students: StudentPerformanceRow[];
  onAddStudent: () => void;
  onBulkImport: () => void;
};

export default function StudentManagementTable({ students, onAddStudent, onBulkImport }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'table' | 'macro'>('table');

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return students.filter((student) => {
      const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim().toLowerCase();
      return (
        fullName.includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.courseStudentId.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, students]);

  const getDisplayName = (student: StudentPerformanceRow) => {
    const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
    return fullName || student.email;
  };

  const getInitials = (student: StudentPerformanceRow) => {
    const first = (student.firstName || student.email[0] || 'S').trim();
    const last = (student.lastName || student.email[1] || '').trim();
    return `${first[0] || 'S'}${last[0] || ''}`.toUpperCase();
  };

  const getLectureRate = (student: StudentPerformanceRow) => {
    if (student.lecturesTotal === 0) return 0;
    return Math.round((student.lecturesCompleted / student.lecturesTotal) * 100);
  };

  const getOverallPercent = (student: StudentPerformanceRow) => {
    const values = [
      student.assignmentsAvg,
      student.quizzesAvg,
      getLectureRate(student),
    ].filter((value): value is number => value !== null && !Number.isNaN(value));

    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  const macroStats = useMemo(() => {
    const totalStudents = students.length;
    const assignmentAverages = students
      .map((student) => student.assignmentsAvg)
      .filter((value): value is number => value !== null);
    const quizAverages = students
      .map((student) => student.quizzesAvg)
      .filter((value): value is number => value !== null);
    const lectureRates = students.map((student) => getLectureRate(student));

    return {
      totalStudents,
      avgAssignment: assignmentAverages.length > 0
        ? Math.round(assignmentAverages.reduce((sum, value) => sum + value, 0) / assignmentAverages.length)
        : 0,
      avgQuizScore: quizAverages.length > 0
        ? Math.round(quizAverages.reduce((sum, value) => sum + value, 0) / quizAverages.length)
        : 0,
      avgLecture: lectureRates.length > 0
        ? Math.round(lectureRates.reduce((sum, value) => sum + value, 0) / lectureRates.length)
        : 0,
      atRisk: students.filter((student) => {
        const overallPercent = getOverallPercent(student);
        const assignmentCompletion = student.assignmentsTotal > 0
          ? (student.assignmentsSubmitted / student.assignmentsTotal) * 100
          : 100;
        const lectureRate = getLectureRate(student);

        return (overallPercent !== null && overallPercent < 70) || assignmentCompletion < 50 || lectureRate < 50;
      }).length,
    };
  }, [students]);

  const insights = useMemo<InsightProps[]>(() => {
    if (students.length === 0) {
      return [
        {
          title: 'No Roster Data',
          description: 'Add students to this course to unlock roster-level assignment, quiz, and lecture analytics.',
          color: 'blue',
        },
      ];
    }

    const rankedStudents = [...students]
      .map((student) => ({ student, score: getOverallPercent(student) }))
      .filter((item): item is { student: StudentPerformanceRow; score: number } => item.score !== null)
      .sort((a, b) => b.score - a.score);

    const topStudent = rankedStudents[0]?.student;
    const atRiskStudents = students.filter((student) => {
      const overallPercent = getOverallPercent(student);
      const assignmentCompletion = student.assignmentsTotal > 0
        ? (student.assignmentsSubmitted / student.assignmentsTotal) * 100
        : 100;
      const lectureRate = getLectureRate(student);

      return (overallPercent !== null && overallPercent < 70) || assignmentCompletion < 50 || lectureRate < 50;
    });
    const lowLectureStudents = students.filter((student) => getLectureRate(student) < 60);
    const pendingAssignments = students.reduce((sum, student) => {
      return sum + Math.max(student.assignmentsTotal - student.assignmentsSubmitted, 0);
    }, 0);

    return [
      {
        title: 'Top Performer',
        description: topStudent
          ? `${getDisplayName(topStudent)} is currently leading the course based on submitted work, quiz results, and lecture completion.`
          : 'No graded or completed activity is available yet to rank student performance.',
        color: 'green',
      },
      {
        title: 'Students Needing Attention',
        description: atRiskStudents.length > 0
          ? `${atRiskStudents.length} student${atRiskStudents.length === 1 ? '' : 's'} show low completion or low scores and may need a check-in.`
          : 'No students are currently flagged as at risk based on the tracked course metrics.',
        color: atRiskStudents.length > 0 ? 'red' : 'blue',
      },
      {
        title: 'Lecture Engagement',
        description: lowLectureStudents.length > 0
          ? `${lowLectureStudents.length} student${lowLectureStudents.length === 1 ? '' : 's'} have completed fewer than 60% of the course lectures.`
          : 'Lecture completion is healthy across the current roster.',
        color: lowLectureStudents.length > 0 ? 'yellow' : 'green',
      },
      {
        title: 'Assignment Progress',
        description: pendingAssignments > 0
          ? `${pendingAssignments} assignment submission${pendingAssignments === 1 ? '' : 's'} are still pending across the class.`
          : 'All assigned coursework has been submitted so far.',
        color: pendingAssignments > 0 ? 'blue' : 'green',
      },
    ];
  }, [students]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600 text-sm mt-1">{filteredStudents.length} students enrolled</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setView('macro')}
            variant={view === 'macro' ? 'default' : 'outline'}
            className={view === 'macro' ? 'bg-brand-maroon hover:bg-brand-maroon-hover text-white' : 'border-gray-300 hover:bg-gray-50'}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Macro View
          </Button>
          <Button
            onClick={() => setView('table')}
            variant={view === 'table' ? 'default' : 'outline'}
            className={view === 'table' ? 'bg-brand-maroon hover:bg-brand-maroon-hover text-white' : 'border-gray-300 hover:bg-gray-50'}
          >
            <Users className="w-4 h-4 mr-2" />
            Table View
          </Button>
          <Button
            onClick={onAddStudent}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Add Student
          </Button>
          <Button
            onClick={onBulkImport}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search students by name, email, or roster ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base border-gray-300"
        />
      </div>

      {view === 'macro' ? (
        <>
          <StudentMacroView stats={macroStats} />
          <AIClassInsights insights={insights} />
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Assignments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Online Quizzes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => {
                  return (
                    <tr key={student.courseStudentId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-brand-maroon text-white">
                            <AvatarFallback className="bg-brand-maroon text-white font-semibold">
                              {getInitials(student)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {getDisplayName(student)}
                            </div>
                            <div className="text-xs text-gray-500">{student.courseStudentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{student.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900">
                            {student.assignmentsSubmitted}/{student.assignmentsTotal}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.assignmentsAvg !== null ? `${student.assignmentsAvg}% avg` : 'No graded work yet'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-semibold text-gray-900">
                            {student.quizzesCompleted}/{student.quizzesTotal}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.quizzesAvg !== null ? `${student.quizzesAvg}% avg` : 'No quiz results yet'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="p-12 text-center text-gray-600">
              No students match your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
