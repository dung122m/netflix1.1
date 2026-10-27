import { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HistoryClient } from "./HistoryClient";

export const metadata: Metadata = {
  title: "Biên Niên Sử Việt Nam | Dòng Thời Gian Lịch Sử Hào Hùng - Nanaflix",
  description:
    "Tra cứu hơn 3.300 mốc son lịch sử, các trận chiến hiển hách và danh nhân lập quốc qua 11 thời kỳ lịch sử vẻ vang từ thời các Vua Hùng dựng nước đến nay.",
  keywords: [
    "lịch sử việt nam",
    "biên niên sử việt nam",
    "timeline lịch sử",
    "hôm nay trong lịch sử",
    "nanaflix lịch sử",
  ],
  openGraph: {
    title: "Biên Niên Sử Việt Nam | Dòng Thời Gian Lịch Sử Hào Hùng - Nanaflix",
    description:
      "Tra cứu hơn 3.300 mốc son lịch sử, các trận chiến hiển hách và danh nhân lập quốc qua 11 thời kỳ lịch sử vẻ vang từ thời các Vua Hùng dựng nước đến nay.",
    type: "website",
  },
};

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />
      <div className="flex-1 pt-16 sm:pt-20">
        <HistoryClient />
      </div>
      <Footer />
    </div>
  );
}

