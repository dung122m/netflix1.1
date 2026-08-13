import Link from 'next/link';
import { HeroSection } from '@/components/sites/netflix-3f78535a/vn-d838105b/HeroSection';
import { FeatureRowTV } from '@/components/sites/netflix-3f78535a/vn-d838105b/FeatureRowTV';
import { FeatureRowDownload } from '@/components/sites/netflix-3f78535a/vn-d838105b/FeatureRowDownload';
import { FeatureRowWatch } from '@/components/sites/netflix-3f78535a/vn-d838105b/FeatureRowWatch';
import { FeatureRowKids } from '@/components/sites/netflix-3f78535a/vn-d838105b/FeatureRowKids';
import { FAQSection } from '@/components/sites/netflix-3f78535a/vn-d838105b/FAQSection';
import { FooterSection } from '@/components/sites/netflix-3f78535a/vn-d838105b/FooterSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeatureRowTV />
      <FeatureRowDownload />
      <FeatureRowWatch />
      <FeatureRowKids />
      <FAQSection />
      <FooterSection />
      <div className="fixed bottom-4 right-4 z-50">
        <Link href="/browse" className="bg-white text-black px-4 py-2 rounded font-bold">Switch to Browse</Link>
      </div>
    </main>
  );
}
