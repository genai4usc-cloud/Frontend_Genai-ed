'use client';

import { Clock, Calendar, Eye, TrendingUp, CreditCard as Edit, Trash2, Video, Mic, FileText, Play, Download } from 'lucide-react';

interface LectureArtifact {
  id: string;
  artifact_type: string;
  file_url: string;
}

interface EducatorLectureCardProps {
  lecture: {
    id: string;
    title: string;
    description?: string;
    status: string;
    created_at: string;
    video_length: number;
    artifacts: LectureArtifact[];
  };
  analytics?: {
    views: number;
    completionRate: number;
    avgWatchTimeSeconds: number;
  };
  onEdit: () => void;
  onDelete: () => void;
  onPlayVideo?: (url: string) => void;
  onPlayAudio?: (url: string) => void;
  onDeleteArtifact?: (artifactId: string, type: string) => void;
}

export default function EducatorLectureCard({
  lecture,
  analytics,
  onEdit,
  onDelete,
  onPlayVideo,
  onPlayAudio,
  onDeleteArtifact
}: EducatorLectureCardProps) {
  const videoArtifact = lecture.artifacts.find(a => a.artifact_type === 'video_avatar');
  const audioArtifact = lecture.artifacts.find(a => a.artifact_type === 'audio');
  const pptxArtifact = lecture.artifacts.find(a => a.artifact_type === 'pptx');

  const formatWatchTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{lecture.title}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                lecture.status === 'published' ? 'bg-green-50 text-green-700 border border-green-200' :
                lecture.status === 'generated' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-gray-50 text-gray-700 border border-gray-200'
              }`}>
                {lecture.status.charAt(0).toUpperCase() + lecture.status.slice(1)}
              </span>
            </div>
            {lecture.description && (
              <p className="text-gray-600 text-sm mb-3">{lecture.description}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{lecture.video_length} min</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(lecture.created_at).toLocaleDateString()}</span>
              </div>
              {analytics && (
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{analytics.views} views</span>
                </div>
              )}
            </div>

            {analytics && (
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Completion Rate</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getCompletionColor(analytics.completionRate)}`}
                        style={{ width: `${analytics.completionRate}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{analytics.completionRate}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Avg Watch Time</div>
                  <div className="text-sm font-semibold text-gray-900">{formatWatchTime(analytics.avgWatchTimeSeconds)}</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded hover:bg-gray-100"
              title="Edit lecture"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded hover:bg-red-50"
              title="Delete lecture"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {videoArtifact && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-brand-maroon p-1.5 rounded">
                      <Video className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">Video</span>
                  </div>
                  {onDeleteArtifact && (
                    <button
                      onClick={() => onDeleteArtifact(videoArtifact.id, 'video')}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {onPlayVideo && (
                    <button
                      onClick={() => onPlayVideo(videoArtifact.file_url)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-1.5 px-2 rounded transition-colors text-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Play
                    </button>
                  )}
                  <a
                    href={videoArtifact.file_url}
                    download
                    className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 p-1.5 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-700" />
                  </a>
                </div>
              </div>
            )}

            {audioArtifact && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded">
                      <Mic className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">Audio</span>
                  </div>
                  {onDeleteArtifact && (
                    <button
                      onClick={() => onDeleteArtifact(audioArtifact.id, 'audio')}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete audio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {onPlayAudio && (
                    <button
                      onClick={() => onPlayAudio(audioArtifact.file_url)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-1.5 px-2 rounded transition-colors text-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Play
                    </button>
                  )}
                  <a
                    href={audioArtifact.file_url}
                    download
                    className="flex items-center justify-center bg-white hover:bg-gray-50 border border-gray-300 p-1.5 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-700" />
                  </a>
                </div>
              </div>
            )}

            {pptxArtifact && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-orange-600 p-1.5 rounded">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">Slides</span>
                  </div>
                  {onDeleteArtifact && (
                    <button
                      onClick={() => onDeleteArtifact(pptxArtifact.id, 'pptx')}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete slides"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <a
                  href={pptxArtifact.file_url}
                  download
                  className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium py-1.5 px-2 rounded transition-colors text-xs w-full"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
