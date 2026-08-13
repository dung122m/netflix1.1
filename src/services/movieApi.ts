const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export interface MovieFilterParams {
  category?: string;
  country?: string;
  year?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}

export const movieApi = {
  // ==========================================
  // 1. LẤY DANH SÁCH PHIM
  // ==========================================
  getMovies: async ({
    category,
    country,
    year,
    keyword,
    page = 1,
    limit = 24,
  }: MovieFilterParams = {}) => {
    if (!baseUrl) {
      throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");
    }

    // ========================================
    // TÌM KIẾM
    // ========================================
    if (keyword?.trim()) {
      const searchParams = new URLSearchParams();

      searchParams.set("keyword", keyword.trim());

      searchParams.set("page", String(page));

      searchParams.set("limit", String(limit));

      const searchUrl = `${baseUrl}/tim-kiem?${searchParams.toString()}`;

      console.log("🔎 SEARCH API:", searchUrl);

      try {
        const response = await fetch(searchUrl, {
          method: "GET",
          next: {
            revalidate: 30,
          },
        });

        if (!response.ok) {
          throw new Error(`Lỗi ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error("❌ Lỗi tìm kiếm:", error);

        return {
          status: false,
          items: [],
        };
      }
    }

    // ========================================
    // DANH SÁCH + FILTER
    // ========================================
    const queryParams = new URLSearchParams();

    queryParams.set("page", String(page));

    queryParams.set("limit", String(limit));

    // CATEGORY
    if (category && category.trim() !== "") {
      queryParams.set("category", category);
    }

    // COUNTRY
    if (country && country.trim() !== "") {
      queryParams.set("country", country);
    }

    // YEAR
    if (year && year.trim() !== "") {
      queryParams.set("year", year);
    }

    const url = `${baseUrl}/danh-sach/?${queryParams.toString()}`;

    console.log("================================");

    console.log("🎬 MOVIE API");

    console.log("CATEGORY:", category);

    console.log("COUNTRY:", country);

    console.log("YEAR:", year);

    console.log("PAGE:", page);

    console.log("API URL:", url);

    console.log("================================");

    try {
      const response = await fetch(url, {
        method: "GET",
        next: {
          revalidate: 30,
        },
      });

      if (!response.ok) {
        throw new Error(`API lỗi ${response.status}: ${url}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Lỗi gọi API:", error);

      return {
        status: false,
        items: [],
      };
    }
  },

  // ==========================================
  // 2. LẤY FILTER
  // ==========================================
  getFilters: async () => {
    if (!baseUrl) {
      throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");
    }

    try {
      const [theLoaiRes, quocGiaRes] = await Promise.all([
        fetch(`${baseUrl}/the-loai`, {
          next: {
            revalidate: 3600,
          },
        }),

        fetch(`${baseUrl}/quoc-gia`, {
          next: {
            revalidate: 3600,
          },
        }),
      ]);

      if (!theLoaiRes.ok) {
        throw new Error("Không thể tải danh sách thể loại");
      }

      if (!quocGiaRes.ok) {
        throw new Error("Không thể tải danh sách quốc gia");
      }

      const theLoaiData = await theLoaiRes.json();

      const quocGiaData = await quocGiaRes.json();

      const currentYear = new Date().getFullYear();

      const years = Array.from(
        {
          length: 50,
        },
        (_, index) => String(currentYear - index),
      );

      return {
        genres: theLoaiData.data?.items || theLoaiData.items || [],

        countries: quocGiaData.data?.items || quocGiaData.items || [],

        years,
      };
    } catch (error) {
      console.error("❌ Lỗi tải filter:", error);

      return {
        genres: [],
        countries: [],
        years: [],
      };
    }
  },

  // ==========================================
  // 3. CHI TIẾT PHIM
  // ==========================================
  getMovieDetail: async (slug: string) => {
    if (!baseUrl) {
      throw new Error("Chưa cấu hình NEXT_PUBLIC_API_URL");
    }

    try {
      const response = await fetch(`${baseUrl}/phim/${slug}`, {
        method: "GET",
        next: {
          revalidate: 300,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }

        throw new Error(`Lỗi ${response.status} khi tải chi tiết phim`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Lỗi tải chi tiết phim:", error);

      throw error;
    }
  },
};
