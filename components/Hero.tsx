export default function Hero() {
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#990000] mb-6 leading-tight">
            Welcome to the USC GenAI Learning Platform
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-700 leading-relaxed">
            Empowering educators and students with responsible AI integration
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <source
                src="https://cdn.pixabay.com/video/2023/05/01/159773-821445071_large.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
