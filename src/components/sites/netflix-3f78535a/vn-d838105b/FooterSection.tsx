import Link from "next/link";
import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="bg-black text-gray-400 py-12 px-6 md:px-20 mt-20 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto">
        {/* Social Icons */}
        <div className="flex gap-6 mb-6">
          {/* Facebook */}
          <a
            href="#"
            aria-label="Facebook"
            className="hover:text-white transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M14 8h3V4h-3c-3.3 0-5 1.7-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.7.3-1 1-1z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href="#"
            aria-label="Instagram"
            className="hover:text-white transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-6 h-6"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </a>

          {/* Twitter / X */}
          <a
            href="#"
            aria-label="Twitter"
            className="hover:text-white transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2zm-1.1 17.8h1.73L8.27 4.1H6.41L17.8 19.8z" />
            </svg>
          </a>

          {/* Youtube */}
          <a
            href="#"
            aria-label="Youtube"
            className="hover:text-white transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5v-7L16 12l-6.4 3.5z" />
            </svg>
          </a>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-sm">
          <Link href="#" className="hover:underline">
            Câu hỏi thường gặp
          </Link>

          <Link href="#" className="hover:underline">
            Trung tâm trợ giúp
          </Link>

          <Link href="#" className="hover:underline">
            Điều khoản sử dụng
          </Link>

          <Link href="#" className="hover:underline">
            Quyền riêng tư
          </Link>

          <Link href="#" className="hover:underline">
            Thông tin doanh nghiệp
          </Link>

          <Link href="#" className="hover:underline">
            Liên hệ với chúng tôi
          </Link>

          <Link href="#" className="hover:underline">
            Kiểm tra tốc độ
          </Link>

          <Link href="#" className="hover:underline">
            Thông báo pháp lý
          </Link>
        </div>

        {/* Powered By */}
        {/* Powered By */}
        <div className="border-t border-zinc-900 pt-8">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4 group">
              {/* Avatar */}
              <Image
                src="/images/nana-footer.jpg"
                alt="Nana"
                width={48}
                height={48}
                className="
          w-10 h-10
          sm:w-12 sm:h-12
          rounded-full
          object-cover
          border border-zinc-800
          group-hover:border-zinc-600
          group-hover:scale-105
          transition-all
          duration-300
        "
              />

              {/* Text */}
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-semibold text-zinc-500 leading-tight">
                  {" "}
                  Powered By Nana
                </span>
              </div>
            </div>

            {/* Copyright */}
            <p className="mt-4 text-[11px] sm:text-xs text-zinc-600 text-center">
              © {new Date().getFullYear()} Nana. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
