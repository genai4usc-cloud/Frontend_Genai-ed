'use client';

interface GenerationSettingsProps {
  temperature: number;
  maxTokens: number;
  includeSystemInstruction: boolean;
  systemPrompt: string;
  onTemperatureChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onIncludeSystemInstructionChange: (value: boolean) => void;
  onSystemPromptChange: (value: string) => void;
}

export default function GenerationSettings({
  temperature,
  maxTokens,
  includeSystemInstruction,
  systemPrompt,
  onTemperatureChange,
  onMaxTokensChange,
  onIncludeSystemInstructionChange,
  onSystemPromptChange,
}: GenerationSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Temperature: {temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-maroon"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.0 (Precise)</span>
          <span>1.0 (Creative)</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Tokens: {maxTokens}
        </label>
        <input
          type="range"
          min="256"
          max="4096"
          step="256"
          value={maxTokens}
          onChange={(e) => onMaxTokensChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-maroon"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>256</span>
          <span>4096</span>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSystemInstruction}
            onChange={(e) => onIncludeSystemInstructionChange(e.target.checked)}
            className="w-4 h-4 text-brand-maroon bg-gray-100 border-gray-300 rounded focus:ring-brand-maroon focus:ring-2"
          />
          <span className="text-sm font-medium text-gray-700">Include System Instruction</span>
        </label>
      </div>

      {includeSystemInstruction && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Enter system instructions for the AI..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-maroon focus:border-transparent resize-none"
          />
        </div>
      )}
    </div>
  );
}
