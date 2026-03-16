'use client';

import { useState, useMemo } from 'react';
import { Search, Download, UserPlus, MoveVertical as MoreVertical, TrendingUp, TrendingDown, Minus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

type StudentData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  assignmentsAvg: number;
  quizAvg: number;
  quizCompleted: number;
  quizTotal: number;
  lecturesAttended: number;
  lecturesTotal: number;
  aiUsage: 'low' | 'medium' | 'high';
  aiUsageCount: number;
  trend: 'improving' | 'declining' | 'stable';
};

type Props = {
  courseId: string;
  onAddStudent: () => void;
  onBulkImport: () => void;
};

export default function StudentManagementTable({ courseId, onAddStudent, onBulkImport }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'table' | 'macro'>('table');

  const mockStudents: StudentData[] = [
    {
      id: 'S001',
      firstName: 'Emily',
      lastName: 'Johnson',
      email: 'emily.j@usc.edu',
      assignmentsCompleted: 3,
      assignmentsTotal: 4,
      assignmentsAvg: 92,
      quizAvg: 92,
      quizCompleted: 11,
      quizTotal: 12,
      lecturesAttended: 22,
      lecturesTotal: 24,
      aiUsage: 'medium',
      aiUsageCount: 45,
      trend: 'improving'
    },
    {
      id: 'S004',
      firstName: 'James',
      lastName: 'Rodriguez',
      email: 'james.r@usc.edu',
      assignmentsCompleted: 3,
      assignmentsTotal: 4,
      assignmentsAvg: 95,
      quizAvg: 95,
      quizCompleted: 12,
      quizTotal: 12,
      lecturesAttended: 23,
      lecturesTotal: 24,
      aiUsage: 'high',
      aiUsageCount: 98,
      trend: 'improving'
    },
    {
      id: 'S002',
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.c@usc.edu',
      assignmentsCompleted: 4,
      assignmentsTotal: 4,
      assignmentsAvg: 88,
      quizAvg: 88,
      quizCompleted: 12,
      quizTotal: 12,
      lecturesAttended: 24,
      lecturesTotal: 24,
      aiUsage: 'high',
      aiUsageCount: 127,
      trend: 'stable'
    },
    {
      id: 'S003',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.w@usc.edu',
      assignmentsCompleted: 2,
      assignmentsTotal: 4,
      assignmentsAvg: 76,
      quizAvg: 76,
      quizCompleted: 10,
      quizTotal: 12,
      lecturesAttended: 18,
      lecturesTotal: 24,
      aiUsage: 'low',
      aiUsageCount: 12,
      trend: 'declining'
    },
    {
      id: 'S005',
      firstName: 'Sophia',
      lastName: 'Martinez',
      email: 'sophia.m@usc.edu',
      assignmentsCompleted: 4,
      assignmentsTotal: 4,
      assignmentsAvg: 85,
      quizAvg: 85,
      quizCompleted: 11,
      quizTotal: 12,
      lecturesAttended: 21,
      lecturesTotal: 24,
      aiUsage: 'medium',
      aiUsageCount: 52,
      trend: 'stable'
    }
  ];

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return mockStudents.filter(student =>
      student.firstName.toLowerCase().includes(query) ||
      student.lastName.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const getUsageBadgeColor = (usage: string) => {
    switch (usage) {
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving': return 'Improving';
      case 'declining': return 'Declining';
      case 'stable': return 'Stable';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600 text-sm mt-1">{filteredStudents.length} students enrolled</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setView(view === 'table' ? 'macro' : 'table')}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50"
          >
            {view === 'table' ? 'Macro View' : 'Table View'}
          </Button>
          <Button
            onClick={onBulkImport}
            variant="outline"
            className="border-gray-300 hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>
          <Button
            onClick={onAddStudent}
            className="bg-brand-maroon hover:bg-brand-maroon-hover text-white flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Add Student
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search students by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base border-gray-300"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assignments
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Quiz Avg
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Lectures
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  AI Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trend
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{student.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-brand-maroon text-white">
                        <AvatarFallback className="bg-brand-maroon text-white font-semibold">
                          {getInitials(student.firstName, student.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {student.firstName} {student.lastName}
                        </div>
                        {student.id === 'S001' || student.id === 'S004' ? (
                          <span className="text-xs text-red-600 font-medium">New message</span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{student.email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">
                        {student.assignmentsCompleted}/{student.assignmentsTotal}
                      </div>
                      <div className="text-xs text-gray-500">{student.assignmentsAvg}% avg</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">
                        {student.quizCompleted}/{student.quizTotal}
                      </div>
                      <div className="text-xs text-gray-500">{student.quizAvg}% avg</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {student.lecturesAttended}/{student.lecturesTotal}
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-brand-maroon h-2 rounded-full"
                          style={{ width: `${(student.lecturesAttended / student.lecturesTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <Badge className={`${getUsageBadgeColor(student.aiUsage)} border font-medium`}>
                        {student.aiUsage}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">{student.aiUsageCount} uses</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(student.trend)}
                      <span className="text-sm text-gray-700">{getTrendText(student.trend)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-brand-maroon hover:text-brand-maroon-hover font-medium text-sm">
                      View Details
                    </button>
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
