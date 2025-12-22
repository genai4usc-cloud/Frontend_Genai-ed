'use client';

import { useRouter } from 'next/navigation';
import { UserCircle, GraduationCap } from 'lucide-react';

export default function RoleCTA() {
  const router = useRouter();

  const handleEducatorClick = () => {
    localStorage.setItem('selectedRole', 'educator');
    router.push('/educator/login');
  };

  const handleStudentClick = () => {
    localStorage.setItem('selectedRole', 'student');
    router.push('/student/login');
  };

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Get Started by Selecting Your Role
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
          <button
            onClick={handleEducatorClick}
            className="bg-[#FFCC00] text-black px-12 py-4 rounded-lg text-xl hover:bg-[#e6b800] transition-all transform hover:scale-105 shadow-lg"
          >
            I&apos;m an Educator
          </button>

          <button
            onClick={handleStudentClick}
            className="bg-[#990000] text-white px-12 py-4 rounded-lg text-xl hover:bg-[#800000] transition-all transform hover:scale-105 shadow-lg"
          >
            I&apos;m a Student
          </button>
        </div>

        <div className="text-center">
          <a
            href="#"
            className="text-sm text-gray-700 hover:text-[#990000] underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#990000] rounded px-2 py-1"
          >
            Sign in as an administrator
          </a>
        </div>
      </div>
    </section>
  );
}
