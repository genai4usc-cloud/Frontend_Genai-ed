'use client';

import { Users, FileText, ListChecks, BookOpen, AlertCircle } from 'lucide-react';

type MacroStats = {
  totalStudents: number;
  avgAssignment: number;
  avgQuizScore: number;
  avgLecture: number;
  atRisk: number;
};

type Props = {
  stats: MacroStats;
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default function StudentMacroView({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        icon={Users}
        label="Total Students"
        value={stats.totalStudents}
        color="blue"
      />
      <StatCard
        icon={FileText}
        label="Avg Assignment"
        value={`${stats.avgAssignment}%`}
        color="green"
      />
      <StatCard
        icon={ListChecks}
        label="Avg Quiz Score"
        value={`${stats.avgQuizScore}%`}
        color="purple"
      />
      <StatCard
        icon={BookOpen}
        label="Avg Lecture"
        value={`${stats.avgLecture}%`}
        color="orange"
      />
      <StatCard
        icon={AlertCircle}
        label="At Risk"
        value={stats.atRisk}
        color="red"
      />
    </div>
  );
}
