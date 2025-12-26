'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GraduationCap, Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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
    <nav className="sticky top-0 z-50 bg-brand-maroon text-white shadow-md">
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
              <span className="text-xs sm:text-sm text-brand-yellow leading-tight whitespace-nowrap">Empowering Education with AI</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={link.onClick}
                  className={`text-base font-medium transition-colors relative pb-1 ${
                    pathname === link.href
                      ? 'text-brand-yellow after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-brand-yellow'
                      : 'text-white hover:text-brand-yellow'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <ThemeToggle />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="p-2 rounded-md hover:bg-brand-maroon-hover transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-brand-maroon-hover border-t border-brand-maroon">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={link.onClick}
                className={`block px-4 py-2 rounded-md text-base font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-brand-yellow text-brand-maroon'
                    : 'text-white hover:bg-brand-maroon-hover'
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
