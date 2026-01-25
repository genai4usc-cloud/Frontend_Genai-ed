'use client';

export default function DemoSection() {
  const demoVideoUrl = '/videos/platform-overview.mp4';

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
