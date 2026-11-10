import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ACCENT_PRESETS, ACCENT_COOKIE_KEY } from "@/lib/accentStudio";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { BackToTop } from "@/components/layout/BackToTop";
import { ToastContainer } from "@/components/ui/Toast";
import { ClientModals } from "@/components/modals/ClientModals";
import { InstallPwaBanner } from "@/components/layout/InstallPwaBanner";
import { DesktopReplyPopup } from "@/components/Notifications/DesktopReplyPopup";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";
import { SiteVisitTracker } from "@/components/layout/SiteVisitTracker";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const siteUrl = "https://nanaflix.asia";

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
    title: "Nanaflix - Xem Phim & Trực Tiếp Thể Thao Miễn Phí Chất Lượng Cao",
    description:
      "Xem phim bom tấn, anime vietsub và theo dõi trực tiếp bóng đá Ngoại Hạng Anh, C1, V-League Full HD mượt mà cùng Trợ lý Nana AI.",
    images: [
      {
        url: `${siteUrl}/og-cinema.jpg?v=2026`,
        secureUrl: `${siteUrl}/og-cinema.jpg?v=2026`,
        width: 1200,
        height: 630,
        alt: "Nanaflix - Xem Phim & Trực Tiếp Thể Thao Full HD",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nanaflix - Xem Phim & Trực Tiếp Thể Thao Miễn Phí",
    description:
      "Xem phim bom tấn, anime vietsub và theo dõi trực tiếp bóng đá Ngoại Hạng Anh, C1, V-League Full HD mượt mà cùng Trợ lý Nana AI.",
    images: [`${siteUrl}/og-cinema.jpg?v=2026`],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let savedThemeId = "netflix-red";
  try {
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(ACCENT_COOKIE_KEY)?.value;
    if (cookieVal) {
      savedThemeId = cookieVal;
    }
  } catch {
    // Trong môi trường static build hoặc worker không có request context
  }

  const activePreset =
    ACCENT_PRESETS.find((p) => p.id === savedThemeId) || ACCENT_PRESETS[0];

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      data-accent={activePreset.id}
      className={`${beVietnamPro.variable} font-sans antialiased bg-black text-white dark`}
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
                  if (savedTheme) {
                    document.documentElement.setAttribute('data-accent', savedTheme);
                    try {
                      document.cookie = 'nanaflix_theme=' + encodeURIComponent(savedTheme) + '; path=/; max-age=31536000; SameSite=Lax';
                    } catch(e) {}
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
                    // Tự động ngắt kết nối sau khi React hoàn tất hydrate (3.5s) để giải phóng tài nguyên CPU/RAM
                    setTimeout(function() {
                      observer.disconnect();
                    }, 3500);
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

          {/* Thanh chỉ báo tải trang toàn cục mượt mà (Top Progress Bar) */}
          <NavigationProgressBar />

          {/* Minimal Site Visit Tracker for Nanaflix (Phase 2) */}
          <SiteVisitTracker />

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

          {/* Client-side modals: Actor Bio, Profile, Auth — lazy-loaded client-side */}
          <ClientModals />

          {/* PWA Smart Install Banner & Modal */}
          <InstallPwaBanner />

        </AuthProvider>
      </body>
    </html>
  );
}

