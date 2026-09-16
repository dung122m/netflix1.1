import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { BackToTop } from "@/components/BackToTop";
import { ToastContainer } from "@/components/Toast";
import { ClientModals } from "@/components/ClientModals";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";
import { ContinueWatchingWidget } from "@/components/ContinueWatchingWidget";
import { DesktopReplyPopup } from "@/components/Notifications/DesktopReplyPopup";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://netflix1-1.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nanaflix - Thế Giới Điện Ảnh Của Nana | Xem Phim HD Miễn Phí",
    template: "%s | Nanaflix",
  },
  description:
    "Nanaflix - Xem phim trực tuyến chất lượng cao Full HD cùng Trợ lý Nana gợi ý phim thông minh, cập nhật liên tục các siêu phẩm điện ảnh mới nhất, phim bộ, phim lẻ, anime vietsub và thuyết minh.",
  keywords: [
    "xem phim online",
    "phim moi",
    "phim chieu rap",
    "phim bo",
    "phim le",
    "anime vietsub",
    "phim thuyet minh",
    "Nanaflix",
    "xem phim hd",
  ],
  authors: [{ name: "Nanaflix Team", url: siteUrl }],
  creator: "Nanaflix",
  publisher: "Nanaflix",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nanaflix",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: siteUrl,
    siteName: "Nanaflix",
    title: "Nanaflix - Thế Giới Điện Ảnh Của Nana | Xem Phim HD Miễn Phí",
    description:
      "Nanaflix - Xem phim trực tuyến chất lượng cao cùng Trợ lý Nana gợi ý phim thông minh, cập nhật liên tục các siêu phẩm điện ảnh mới nhất.",
    images: [
      {
        url: `${siteUrl}/default-hero.jpg`,
        secureUrl: `${siteUrl}/default-hero.jpg`,
        width: 1200,
        height: 630,
        alt: "Nanaflix - Xem Phim Online HD",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nanaflix - Thế Giới Điện Ảnh Của Nana",
    description:
      "Nanaflix - Xem phim trực tuyến chất lượng cao cùng Trợ lý Nana gợi ý phim thông minh, cập nhật liên tục các siêu phẩm điện ảnh mới nhất.",
    images: [`${siteUrl}/default-hero.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased bg-black text-white`}
    >
      <head>
        {/* PWA & Mobile Web App */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nanaflix" />
        <meta name="application-name" content="Nanaflix" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#000000" />

        {/* Viewport với safe-area cho iPhone notch & home indicator */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />

        {/* DNS Prefetch & Preconnect cho image CDNs, Supabase & Gemini AI */}
        <link rel="preconnect" href="https://hbrubnilyefrjtglhyap.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://hbrubnilyefrjtglhyap.supabase.co" />
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="preconnect" href="https://phimimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="preconnect" href="https://img.phimapi.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.phimapi.com" />
        <link rel="preconnect" href="https://phim.nguonc.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://phim.nguonc.com" />
        <link rel="preconnect" href="https://img.gvapi.cc" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.gvapi.cc" />
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://m.media-amazon.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />
        <link rel="preconnect" href="https://images-na.ssl-images-amazon.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images-na.ssl-images-amazon.com" />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://s1.phimapi.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://s1.phimapi.com" />
        <link rel="dns-prefetch" href="https://vip.opstream16.com" />
        <link rel="dns-prefetch" href="https://embed.streamc.xyz" />

        {/* Khởi tạo màu giao diện, chế độ sáng/tối và khử các attribute do browser extension tự tiêm vào (bts_skin_checked, etc.) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var m = localStorage.getItem('nanaflix_mode') || 'dark';
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(m);
                  document.documentElement.setAttribute('data-mode', m);

                  var t = localStorage.getItem('nanaflix_theme');
                  if (t) {
                    document.documentElement.setAttribute('data-theme', t);
                  }
                } catch(e) {}

                // Gỡ bỏ các thuộc tính do Chrome Extension (Baidu, Translators, Skins) tiêm vào DOM trước khi React hydrate
                try {
                  var extAttrs = ['bts_skin_checked', 'bis_skin_checked', 'cz-shortcut-listen', 'data-gr-ext-installed', 'data-adblockkey'];
                  var cleanExtAttrs = function() {
                    extAttrs.forEach(function(attr) {
                      var els = document.querySelectorAll('[' + attr + ']');
                      for (var i = 0; i < els.length; i++) {
                        els[i].removeAttribute(attr);
                      }
                    });
                  };
                  cleanExtAttrs();
                  if (typeof MutationObserver !== 'undefined') {
                    var observer = new MutationObserver(function(mutations) {
                      mutations.forEach(function(mutation) {
                        if (mutation.type === 'attributes' && extAttrs.indexOf(mutation.attributeName) !== -1) {
                          mutation.target.removeAttribute(mutation.attributeName);
                        }
                      });
                    });
                    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: extAttrs });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen flex flex-col bg-black text-white"
        suppressHydrationWarning
      >
        <AuthProvider>
          {/* Thanh chỉ báo tải trang toàn cục mượt mà (Top Progress Bar) */}
          <NavigationProgressBar />

          <SmoothScroll>
            <div className="pb-16 lg:pb-0 min-h-screen flex flex-col" suppressHydrationWarning>
              {children}
            </div>
          </SmoothScroll>

          {/* Thanh điều hướng cố định ở đáy cho điện thoại (Bottom Navigation) */}
          <BottomNav />

          {/* Back to top với progress ring */}
          <BackToTop />

          {/* Toast notification system — global */}
          <ToastContainer />

          {/* Facebook-style Desktop Reply & Realtime Notification Popup */}
          <DesktopReplyPopup />

          {/* AI Modals: Concierge, Roulette, Actor Bio — lazy-loaded client-side */}
          <ClientModals />

          {/* PWA Smart Install Banner & Modal */}
          <InstallPwaBanner />

          {/* Seamless Unified Continue Watching & Cross-Device Handoff */}
          <ContinueWatchingWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
