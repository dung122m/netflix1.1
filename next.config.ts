/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vsmov.com",
        pathname: "/**", // Cho phép lấy mọi ảnh từ domain này
      },
      // Nếu API phim của bạn trả về ảnh từ nhiều domain khác nhau (ví dụ: imgur, cloudinary...),
      // bạn cứ copy object trên và đổi hostname là được.
    ],
  },
};

module.exports = nextConfig;
