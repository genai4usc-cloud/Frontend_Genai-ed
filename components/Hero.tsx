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
            <img
              src="https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=1600"
              alt="Modern classroom with technology"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
