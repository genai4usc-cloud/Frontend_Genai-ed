import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import DemoSection from '@/components/DemoSection';
import RoleCTA from '@/components/RoleCTA';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <DemoSection />
      <RoleCTA />
    </main>
  );
}
