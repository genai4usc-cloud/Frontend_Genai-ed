import { LucideIcon } from 'lucide-react';

interface StrategyCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
}

export default function StrategyCard({ icon: Icon, title, description, points }: StrategyCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 h-full border border-gray-200 hover:border-[#990000]/20">
      <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-[#990000] to-[#770000] rounded-full flex items-center justify-center mb-6 shadow-lg">
          <Icon className="w-10 h-10 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{description}</p>

        <ul className="space-y-3 text-left w-full">
          {points.map((point, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="w-2 h-2 bg-[#FFCC00] rounded-full mt-2 flex-shrink-0" />
              <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
