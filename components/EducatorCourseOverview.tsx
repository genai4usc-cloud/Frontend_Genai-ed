'use client';

import { Users, BookOpen, FileText, ListChecks, TrendingUp, Award, AlertCircle, Sparkles } from 'lucide-react';

interface OverviewProps {
  courseId: string;
}

export default function EducatorCourseOverview({ courseId }: OverviewProps) {
  const summaryCards = [
    {
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      title: 'Total Students',
      value: '127',
      subtext: '+12 this week',
      trend: 'up'
    },
    {
      icon: BookOpen,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      title: 'Lectures Created',
      value: '24',
      subtext: '3 published this week',
      trend: 'up'
    },
    {
      icon: FileText,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      title: 'Assignments',
      value: '8',
      subtext: '2 due this week',
      trend: 'neutral'
    },
    {
      icon: ListChecks,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      title: 'Quizzes',
      value: '12',
      subtext: 'Avg score: 84%',
      trend: 'up'
    }
  ];

  const insights = [
    {
      type: 'positive',
      icon: TrendingUp,
      text: 'Student engagement is up 23% compared to last week.',
      color: 'border-green-200 bg-green-50'
    },
    {
      type: 'info',
      icon: Award,
      text: 'Lecture 5 "Neural Networks Basics" has the highest completion rate at 94%.',
      color: 'border-blue-200 bg-blue-50'
    },
    {
      type: 'warning',
      icon: AlertCircle,
      text: '15 students have not yet submitted Assignment 3 due in 2 days. Consider sending a reminder.',
      color: 'border-yellow-200 bg-yellow-50'
    },
    {
      type: 'positive',
      icon: TrendingUp,
      text: 'Quiz completion improved by 11% after the last lecture release.',
      color: 'border-green-200 bg-green-50'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.iconBg} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{card.value}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-gray-900">AI-Generated Insights</h2>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div
                key={index}
                className={`${insight.color} border rounded-lg p-4 flex items-start gap-3`}
              >
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-700" />
                <p className="text-sm text-gray-800 leading-relaxed">{insight.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
