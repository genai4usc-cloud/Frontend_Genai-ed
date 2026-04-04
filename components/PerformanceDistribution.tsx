'use client';

export type PerformanceLevel = {
  label: string;
  range: string;
  count: number;
  percentage: number;
  color: string;
};

type Props = {
  levels: PerformanceLevel[];
};

export default function PerformanceDistribution({ levels }: Props) {
  const totalStudents = levels.reduce((sum, level) => sum + level.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Distribution</h3>

      <div className="space-y-4">
        {levels.map((level, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">{level.label}</span>
                <span className="text-xs text-gray-500">({level.range})</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {level.count} student{level.count !== 1 ? 's' : ''} ({level.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`${level.color} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${level.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Total Students</span>
          <span className="text-lg font-bold text-gray-900">{totalStudents}</span>
        </div>
      </div>
    </div>
  );
}
