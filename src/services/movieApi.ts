// Lấy base URL từ biến môi trường
const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export const movieApi = {
  // 1. Lấy danh sách phim
  getMovies: async (params?: {
    slug?: string;
    type?: string;
    year?: string;
    keyword?: string; // Bổ sung keyword
    page?: number;
  }) => {
    if (!baseUrl) throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");

    const page = params?.page || 1;
    let endpoint = `/danh-sach/phim-moi-cap-nhat?page=${page}`;

    // Ưu tiên 1: Có từ khoá tìm kiếm
    if (params?.keyword) {
      endpoint = `/tim-kiem?keyword=${encodeURIComponent(params.keyword)}&page=${page}`;
    }
    // Ưu tiên 2: Có lọc Thể loại / Quốc gia
    else if (params?.slug) {
      const prefix = params.type === "quoc-gia" ? "/quoc-gia" : "/the-loai";
      const yearQuery = params.year ? `&year=${params.year}` : "";
      endpoint = `${prefix}/${params.slug}?page=${page}${yearQuery}`;
    }
    // Ưu tiên 3: Chỉ lọc theo Năm
    else if (params?.year) {
      endpoint = `/nam/${params.year}?page=${page}`;
    }

    const url = `${baseUrl}${endpoint}`;
    console.log("👉 Đang gọi API Phim:", url);

    try {
      // Cache movie list responses for short time to reduce API calls
      const response = await fetch(url, { method: "GET", next: { revalidate: 30 } });
      if (!response.ok) {
        throw new Error(`Lỗi ${response.status} khi gọi API: ${url}`);
      }
      return await response.json();
    } catch (error) {
      console.error("❌ Lỗi mạng hoặc Fetch thất bại:", error);
      return { status: false, items: [] };
    }
  },

  // 2. Lấy dữ liệu các bộ lọc
  getFilters: async () => {
    if (!baseUrl) throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");

    try {
      // Filters rarely change; cache longer (1 hour)
      const [theLoaiRes, quocGiaRes] = await Promise.all([
        fetch(`${baseUrl}/the-loai`, { next: { revalidate: 3600 } }),
        fetch(`${baseUrl}/quoc-gia`, { next: { revalidate: 3600 } }),
      ]);

      const theLoaiData = await theLoaiRes.json();
      const quocGiaData = await quocGiaRes.json();

      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: 50 }, (_, i) =>
        (currentYear - i).toString(),
      );

      return {
        genres: theLoaiData.data?.items || theLoaiData.items || [],
        countries: quocGiaData.data?.items || quocGiaData.items || [],
        years: years,
      };
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu bộ lọc:", error);
      return { genres: [], countries: [], years: [] };
    }
  },

  // 3. Lấy chi tiết 1 bộ phim
  getMovieDetail: async (slug: string) => {
    if (!baseUrl) throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");
    // Detail can be cached moderately to avoid refetching on metadata + page render
    const response = await fetch(`${baseUrl}/phim/${slug}`, { next: { revalidate: 300 } });
    if (!response.ok) {
      if (response.status === 404) return undefined;
      throw new Error("Lỗi khi tải chi tiết phim");
    }
    return response.json();
  },
};
