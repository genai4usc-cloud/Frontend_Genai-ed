'use client';

import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';

export default function DemoSection() {
  const storagePath = 'Videos/intro2.mp4';

  const demoVideoUrl = useMemo(() => {
    const { data } = supabase.storage.from('media').getPublicUrl(storagePath);
    return data.publicUrl;
  }, []);

  return (
    <section id="demos" className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
          <div className="aspect-video">
            <video
              className="w-full h-full"
              src={demoVideoUrl}
              controls
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
