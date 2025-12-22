'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import VideoModal from './VideoModal';

interface Demo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
}

const demos: Demo[] = [
  {
    id: '1',
    title: 'Platform Overview',
    description: 'Discover how the USC GenAI Learning Platform transforms education through AI integration',
    thumbnail: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
];

export default function DemoSection() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const demoVideoUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

  return (
    <>
      <section id="demos" className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="relative bg-black rounded-2xl overflow-hidden shadow-2xl cursor-pointer group"
            onClick={() => setSelectedVideo(demoVideoUrl)}
          >
            <div className="aspect-video flex items-center justify-center">
              <div className="relative z-10">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-[#FFCC00] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                  <Play className="w-12 h-12 md:w-16 md:h-16 text-[#990000] fill-[#990000] ml-2" />
                </div>
              </div>

              <div className="absolute bottom-6 right-6 text-white text-lg font-medium">
                3:00
              </div>
            </div>
          </div>
        </div>
      </section>

      <VideoModal
        isOpen={selectedVideo !== null}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo || ''}
      />
    </>
  );
}
