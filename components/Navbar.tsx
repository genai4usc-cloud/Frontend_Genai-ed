'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GraduationCap, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToDemos = (e: React.MouseEvent) => {
    e.preventDefault();
    const demosSection = document.getElementById('demos');
    if (demosSection) {
      demosSection.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: 'Home', href: '/', onClick: () => setMobileMenuOpen(false) },
    { name: 'About', href: '/about', onClick: () => setMobileMenuOpen(false) },
    { name: 'Demos', href: '#demos', onClick: scrollToDemos },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#990000] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-9 h-9">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#990000" strokeWidth="3"/>
                <text x="50" y="58" textAnchor="middle" fill="#990000" fontSize="32" fontWeight="bold">USC</text>
              </svg>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-base sm:text-lg font-bold leading-tight whitespace-nowrap">USC GenAI Learning Platform</span>
              <span className="text-xs sm:text-sm text-[#FFCC00] leading-tight whitespace-nowrap">Empowering Education with AI</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={link.onClick}
                className={`text-base font-medium transition-colors relative pb-1 ${
                  pathname === link.href
                    ? 'text-[#FFCC00] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#FFCC00]'
                    : 'text-white hover:text-[#FFCC00]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <button
            className="md:hidden p-2 rounded-md hover:bg-[#880000] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-[#880000] border-t border-[#770000]">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={link.onClick}
                className={`block px-4 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-[#FFCC00] text-[#990000]'
                    : 'text-white hover:bg-[#770000]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
