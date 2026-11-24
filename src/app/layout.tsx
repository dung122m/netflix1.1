import { Suspense } from "react";
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Script from "next/script";
import { GoogleAnalyticsTracker } from "@/components/analytics/GoogleAnalyticsTracker";
import "./globals.css";
import { ACCENT_PRESETS, ACCENT_COOKIE_KEY } from "@/lib/accentStudio";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { BackToTop } from "@/components/layout/BackToTop";
import { ToastContainer } from "@/components/ui/Toast";
import { ClientModals } from "@/components/modals/ClientModals";
import { InstallPwaBanner } from "@/components/layout/InstallPwaBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { AuthProvider } from "@/context/AuthContext";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
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
    "Nanaflix - Xem phim trực tuyến chất lượng cao Full HD, gợi ý phim thông minh đúng gu, cập nhật liên tục các siêu phẩm điện ảnh mới nhất, phim bộ, phim lẻ, anime vietsub và thuyết minh.",
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
      "Xem phim bom tấn, anime vietsub và theo dõi trực tiếp bóng đá Ngoại Hạng Anh, C1, V-League Full HD mượt mà, không quảng cáo phiền toái.",
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
      "Xem phim bom tấn, anime vietsub và theo dõi trực tiếp bóng đá Ngoại Hạng Anh, C1, V-League Full HD mượt mà, không quảng cáo phiền toái.",
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

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-2WN3BJRR5L";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const defaultPreset = ACCENT_PRESETS[0];
  const validAccentIdsJson = JSON.stringify(ACCENT_PRESETS.map((p) => p.id));

  return (
    <html
      lang="vi"
      suppressHydrationWarning
      data-accent={defaultPreset.id}
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

        {/* Viewport với safe-area cho iPhone notch & home indicator */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />

        {/* Preconnect tối ưu cho ảnh TMDb / Cloudflare R2 / trailer / stream */}
        <link rel="preconnect" href="https://image.tmdb.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://media.nanaflix.asia" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://media.nanaflix.asia" />
        <link rel="dns-prefetch" href="https://m.media-amazon.com" />
        <link rel="dns-prefetch" href="https://images-na.ssl-images-amazon.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="https://s1.phimapi.com" />
        <link rel="dns-prefetch" href="https://vip.opstream16.com" />
        <link rel="dns-prefetch" href="https://embed.streamc.xyz" />

        {/* Khởi tạo Dark Mode & Theme Accent (0ms FOUC) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.setAttribute('data-mode', 'dark');

                  var savedTheme = localStorage.getItem('${ACCENT_COOKIE_KEY}');
                  if (!savedTheme && document.cookie) {
                    var cookieMatch = document.cookie.match(new RegExp('(?:^|; )${ACCENT_COOKIE_KEY}=([^;]*)'));
                    if (cookieMatch) savedTheme = decodeURIComponent(cookieMatch[1]);
                  }
                  var validAccents = ${validAccentIdsJson};
                  if (savedTheme && validAccents.indexOf(savedTheme) !== -1) {
                    document.documentElement.setAttribute('data-accent', savedTheme);
                    try {
                      localStorage.setItem('${ACCENT_COOKIE_KEY}', savedTheme);
                      document.cookie = '${ACCENT_COOKIE_KEY}=' + encodeURIComponent(savedTheme) + '; path=/; max-age=31536000; SameSite=Lax';
                    } catch(e) {}
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-dvh flex flex-col bg-black text-white"
        suppressHydrationWarning
      >
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    send_page_view: true,
                    page_path: window.location.pathname,
                    page_location: window.location.href,
                  });
                `,
              }}
            />
            <Suspense fallback={null}>
              <GoogleAnalyticsTracker gaId={GA_MEASUREMENT_ID} />
            </Suspense>
          </>
        )}
        <AuthProvider>

          {/* Thanh chỉ báo tải trang toàn cục mượt mà (Top Progress Bar) */}
          <NavigationProgressBar />

          <SmoothScroll>
            <div className="pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0 min-h-dvh flex flex-col" suppressHydrationWarning>
              {children}
            </div>
          </SmoothScroll>

          {/* Thanh điều hướng cố định ở đáy cho điện thoại (Bottom Navigation) */}
          <BottomNav />

          {/* Back to top với progress ring */}
          <BackToTop />

          {/* Toast notification system — global */}
          <ToastContainer />

          {/* Client-side modals: Actor Bio, Profile, Auth — lazy-loaded client-side */}
          <ClientModals />

          {/* PWA Smart Install Banner & Modal */}
          <InstallPwaBanner />

        </AuthProvider>
      </body>
    </html>
  );
}

