'use client';

import { Sparkles } from 'lucide-react';

export type InsightProps = {
  title: string;
  description: string;
  color: 'green' | 'red' | 'yellow' | 'blue';
};

function InsightCard({ title, description, color }: InsightProps) {
  const colorClasses = {
    green: 'border-l-4 border-l-green-500 bg-green-50',
    red: 'border-l-4 border-l-red-500 bg-red-50',
    yellow: 'border-l-4 border-l-yellow-500 bg-yellow-50',
    blue: 'border-l-4 border-l-blue-500 bg-blue-50'
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
    </div>
  );
}

type Props = {
  insights: InsightProps[];
};

export default function AIClassInsights({ insights }: Props) {

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-900">Class Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, index) => (
          <InsightCard
            key={index}
            title={insight.title}
            description={insight.description}
            color={insight.color}
          />
        ))}
      </div>
    </div>
  );
}
