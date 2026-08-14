import Link from "next/link";
import { NetflixLogo } from "./icons";

export const HeaderNavbar = () => {
  return (
    <header className="absolute top-0 left-0 w-full z-10 p-4 md:px-16 md:py-6 flex justify-between items-center">
      <div className="w-24 md:w-40">
        <Link href="/browse">
          <NetflixLogo className="w-10 h-auto" />
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <select className="bg-transparent text-white border border-white/50 px-2 py-1 rounded text-sm">
          <option>Tiếng Việt</option>
          <option>English</option>
        </select>
      </div>

    </header>
  );
};
