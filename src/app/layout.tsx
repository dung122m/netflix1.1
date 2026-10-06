import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { BackToTop } from "@/components/BackToTop";
import { ToastContainer } from "@/components/Toast";
import { ClientModals } from "@/components/ClientModals";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";
import { DesktopReplyPopup } from "@/components/Notifications/DesktopReplyPopup";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { GlobalVisitorTracker } from "@/components/GlobalVisitorTracker";
import { SecurityWarningListener } from "@/components/Notifications/SecurityWarningListener";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.vercel.app";

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
    icon: [
      { url: "/icon.svg?v=vn-flag-rect", type: "image/svg+xml" },
      { url: "/icon-192.png?v=vn-flag-rect", type: "image/png", sizes: "192x192" },
      { url: "/favicon.ico?v=vn-flag-rect", sizes: "any" },
    ],
    shortcut: "/icon.svg?v=vn-flag-rect",
    apple: "/apple-touch-icon.png?v=vn-flag-rect",
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
      className={`${inter.variable} font-sans antialiased bg-black text-white dark`}
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
        {/* Favicon & App Icons */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg?v=vn-flag-rect" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=vn-flag-rect" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=vn-flag-rect" />
        <link rel="shortcut icon" href="/favicon.ico?v=vn-flag-rect" />

        {/* Viewport với safe-area cho iPhone notch & home indicator */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />

        {/* Preconnect tối ưu duy nhất cho ảnh direct CDN phimimg (không có crossOrigin để khớp với thẻ <img>) */}
        <link rel="preconnect" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://phimimg.com" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://img.phimapi.com" />
        <link rel="dns-prefetch" href="https://phim.nguonc.com" />
        <link rel="dns-prefetch" href="https://img.gvapi.cc" />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />
        <link rel="dns-prefetch" href="https://images-na.ssl-images-amazon.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="https://s1.phimapi.com" />
        <link rel="dns-prefetch" href="https://vip.opstream16.com" />
        <link rel="dns-prefetch" href="https://embed.streamc.xyz" />

        {/* Khởi tạo Dark Mode & Khử các attribute do browser extension tự tiêm vào (bts_skin_checked, etc.) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.setAttribute('data-mode', 'dark');

                  var savedTheme = localStorage.getItem('nanaflix_theme');
                  var themeMap = {
                    'netflix-red': { oklch: 'oklch(0.55 0.23 25)', color: '#E50914', rgb: '229, 9, 20', glow: 'rgba(229, 9, 20, 0.40)', border: 'rgba(229, 9, 20, 0.55)' },
                    'cyber-cyan': { oklch: 'oklch(0.68 0.18 220)', color: '#00b4d8', rgb: '0, 180, 216', glow: 'rgba(0, 180, 216, 0.30)', border: 'rgba(0, 180, 216, 0.50)' },
                    'amethyst-purple': { oklch: 'oklch(0.58 0.22 300)', color: '#a855f7', rgb: '168, 85, 247', glow: 'rgba(168, 85, 247, 0.45)', border: 'rgba(168, 85, 247, 0.55)' },
                    'emerald-green': { oklch: 'oklch(0.62 0.20 150)', color: '#10b981', rgb: '16, 185, 129', glow: 'rgba(16, 185, 129, 0.38)', border: 'rgba(16, 185, 129, 0.50)' },
                    'sunset-gold': { oklch: 'oklch(0.68 0.21 48)', color: '#f59e0b', rgb: '245, 158, 11', glow: 'rgba(245, 158, 11, 0.30)', border: 'rgba(245, 158, 11, 0.50)' },
                    'hot-pink': { oklch: 'oklch(0.62 0.24 350)', color: '#f43f5e', rgb: '244, 63, 94', glow: 'rgba(244, 63, 94, 0.42)', border: 'rgba(244, 63, 94, 0.55)' }
                  };
                  var themeObj = (savedTheme && themeMap[savedTheme]) ? themeMap[savedTheme] : themeMap['netflix-red'];
                  var themeKey = (savedTheme && themeMap[savedTheme]) ? savedTheme : 'netflix-red';
                  document.documentElement.setAttribute('data-accent', themeKey);
                  document.documentElement.style.setProperty('--netflix-red', themeObj.oklch);
                  document.documentElement.style.setProperty('--accent-color', themeObj.color);
                  document.documentElement.style.setProperty('--accent-rgb', themeObj.rgb);
                  document.documentElement.style.setProperty('--accent-glow', themeObj.glow);
                  document.documentElement.style.setProperty('--accent-border', themeObj.border);
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

                // Ngăn chặn các lỗi Unhandled Rejection do browser extensions tự tiêm vào (e.g. Coco, Media Downloader, M_ID)
                try {
                  var isExtErr = function(err, reason) {
                    var str = '' + (err && (err.stack || err.message) || '') + ' ' + (reason && (reason.stack || reason.message) || reason || '');
                    return str.indexOf('chrome-extension://') !== -1 ||
                           str.indexOf('moz-extension://') !== -1 ||
                           str.indexOf('safari-extension://') !== -1 ||
                           str.indexOf('M_ID') !== -1;
                  };

                  window.addEventListener('unhandledrejection', function(event) {
                    if (isExtErr(event.reason, event.reason)) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  }, true);

                  window.addEventListener('error', function(event) {
                    if (isExtErr(event.error, event.message) || (event.filename && event.filename.indexOf('-extension://') !== -1)) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  }, true);
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
          {/* Global site visit tracker — fires once per browser tab session */}
          <GlobalVisitorTracker />

          {/* Client security warning listener for non-intrusive alerts */}
          <SecurityWarningListener />

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
        </AuthProvider>
      </body>
    </html>
  );
}

