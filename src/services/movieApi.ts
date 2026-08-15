const API_VSMOV = process.env.NEXT_PUBLIC_API_URL || "https://vsmov.com/api";
const API_PHIMAPI = process.env.NEXT_PUBLIC_API_URL_2 || "https://phimapi.com";

export interface MovieFilterParams {
  category?: string;
  country?: string;
  year?: string;
  keyword?: string;
  page?: number;
  limit?: number;
  type?: string;
  slug?: string;
}

export const movieApi = {
  // ==========================================
  // 1. LẤY DANH SÁCH PHIM TỪ CẢ 2 NGUỒN
  // ==========================================
  getMovies: async ({
    category,
    country,
    year,
    keyword,
    page = 1,
    limit = 24,
    type,
  }: MovieFilterParams = {}) => {
    // Hàm phụ để fetch và parse dữ liệu an toàn
    const fetchSource = async (baseUrl: string, isSearch: boolean) => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));

        let fullUrl = "";

        // ========================================
        // 🛠 XỬ LÝ ĐƯỜNG DẪN RIÊNG CHO TỪNG NGUỒN
        // ========================================
        if (baseUrl === API_PHIMAPI) {
          if (isSearch && keyword) {
            params.set("keyword", keyword.trim());
            // Link tìm kiếm của KKPhim/Ophim thường là v1/api/tim-kiem
            fullUrl = `${baseUrl}/v1/api/tim-kiem?${params.toString()}`;
          } else {
            if (category) params.set("category", category);
            if (country) params.set("country", country);
            if (year) params.set("year", year);

            // PhimAPI bắt buộc phải có type. Nếu UI của bạn chưa có bộ lọc type, ta mặc định là 'phim-le'
            const currentType = type || "phim-le";
            fullUrl = `${baseUrl}/v1/api/danh-sach/${currentType}?${params.toString()}`;
          }
        } else {
          // VSMOV
          if (isSearch && keyword) {
            params.set("keyword", keyword.trim());
            fullUrl = `${baseUrl}/tim-kiem?${params.toString()}`;
          } else {
            if (category) params.set("category", category);
            if (country) params.set("country", country);
            if (year) params.set("year", year);
            fullUrl = `${baseUrl}/danh-sach/?${params.toString()}`;
          }
        }

        const res = await fetch(fullUrl, { next: { revalidate: 30 } });

        if (!res.ok) {
          return null;
        }

        const json = await res.json();

        // ========================================
        // 🛠 CHUẨN HÓA DỮ LIỆU (DATA MAPPING)
        // ========================================
        if (baseUrl === API_PHIMAPI) {
          // Lấy domain ảnh từ API trả về, hoặc dùng domain dự phòng
          const imageDomain =
            json.data?.APP_DOMAIN_CDN_IMAGE ||
            json.data?.APP_DOMAIN_FRONTEND ||
            "https://phimimg.com/";
          const items = json.data?.items || json.items || [];

          // PhimAPI v1 trả về ảnh bị cụt, cần nối chuỗi
          const mappedItems = items.map(
            (item: {
              thumb_url?: string;
              poster_url?: string;
              slug?: string;
              [key: string]: unknown;
            }) => {
              // Kiểm tra nếu thumb_url chưa có chữ http thì mới nối tên miền vào
              const fixedThumb =
                typeof item.thumb_url === "string" &&
                item.thumb_url.startsWith("http")
                  ? item.thumb_url
                  : `${imageDomain}/${item.thumb_url}`;
              const fixedPoster =
                typeof item.poster_url === "string" &&
                item.poster_url.startsWith("http")
                  ? item.poster_url
                  : `${imageDomain}/${item.poster_url}`;

              return {
                ...item,
                thumb_url: fixedThumb,
                poster_url: fixedPoster,
              };
            },
          );

          return {
            items: mappedItems,
            totalPages:
              json.data?.params?.pagination?.totalPages ||
              json.pagination?.totalPages ||
              0,
          };
        }

        // Với VSMOV, dữ liệu đã chuẩn nên chỉ việc trả về
        return {
          items: json.data?.items || json.items || [],
          totalPages:
            json.data?.params?.pagination?.totalPages ||
            json.pagination?.totalPages ||
            0,
        };
      } catch {
        return null;
      }
    };

    const isSearch = Boolean(keyword?.trim());

    let dataVsmov = null;
    let dataPhimApi = null;

    // ========================================
    // 🛠 LOGIC CHỌN NGUỒN GỌI API THÔNG MINH
    // ========================================
    if (type) {
      // NẾU CÓ CHỌN LOẠI PHIM -> CHỈ GỌI PHIMAPI (Bỏ qua VSMOV để tránh trộn sai kết quả)
      dataPhimApi = await fetchSource(API_PHIMAPI, isSearch);
    } else {
      // NẾU KHÔNG CHỌN LOẠI PHIM -> GỌI ĐỒNG THỜI CẢ 2 NGUỒN
      const [resVsmov, resPhimApi] = await Promise.all([
        fetchSource(API_VSMOV, isSearch),
        fetchSource(API_PHIMAPI, isSearch),
      ]);
      dataVsmov = resVsmov;
      dataPhimApi = resPhimApi;
    }

    // ========================================
    // XỬ LÝ DỮ LIỆU ĐẦU RA
    // ========================================
    const itemsVsmov = dataVsmov?.items || [];
    const itemsPhimApi = dataPhimApi?.items || [];

    // Gộp và lọc trùng lặp slug
    const combinedItems = [...itemsVsmov, ...itemsPhimApi];
    const uniqueItemsMap = new Map();
    combinedItems.forEach((item) => {
      if (!uniqueItemsMap.has(item.slug)) {
        uniqueItemsMap.set(item.slug, item);
      }
    });

    const finalItems = Array.from(uniqueItemsMap.values());

    // Tính tổng số trang và tổng số phim
    const totalPagesVsmov = dataVsmov?.totalPages || 0;
    const totalPagesPhimApi = dataPhimApi?.totalPages || 0;

    // Nếu chỉ gọi 1 nguồn thì maxTotalPages lấy của nguồn đó
    const maxTotalPages = Math.max(totalPagesVsmov, totalPagesPhimApi) || 1;

    // Tính tổng số phim bằng cách lấy (số trang * số limit) của từng nguồn cộng lại
    const totalItemsCount = totalPagesVsmov * limit + totalPagesPhimApi * limit;

    return {
      status: true,
      items: finalItems,
      pagination: {
        currentPage: page,
        totalPages: maxTotalPages,
        totalItems: totalItemsCount, // Trả về tổng số lượng phim
      },
    };
  },

  // ==========================================
  // 2. LẤY FILTER
  // ==========================================
  getFilters: async () => {
    try {
      const [theLoaiRes, quocGiaRes] = await Promise.all([
        fetch(`${API_VSMOV}/the-loai`, { next: { revalidate: 3600 } }),
        fetch(`${API_VSMOV}/quoc-gia`, { next: { revalidate: 3600 } }),
      ]);

      const theLoaiData = await theLoaiRes.json();
      const quocGiaData = await quocGiaRes.json();
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: 50 }, (_, index) =>
        String(currentYear - index),
      );

      return {
        genres: theLoaiData.data?.items || theLoaiData.items || [],
        countries: quocGiaData.data?.items || quocGiaData.items || [],
        years,
      };
    } catch (error) {
      console.error("❌ Lỗi tải filter:", error);
      return { genres: [], countries: [], years: [] };
    }
  },

  // ==========================================
  // 3. CHI TIẾT PHIM (ĐÃ CẬP NHẬT TỐI ƯU 100%)
  // ==========================================
  getMovieDetail: async (slug: string, source?: "vsmov" | "ophim") => {
    try {
      // 1. Nếu đã biết chính xác nguồn là VSMOV
      if (source === "vsmov") {
        const res = await fetch(`${API_VSMOV}/phim/${slug}`, {
          next: { revalidate: 300 },
        });
        if (res.ok) return await res.json();
      }

      // 2. Nếu đã biết chính xác nguồn là Ophim/KKPhim
      if (source === "ophim") {
        const res = await fetch(`${API_PHIMAPI}/phim/${slug}`, {
          next: { revalidate: 300 },
        });
        if (res.ok) return await res.json();
      }

      // 3. Nếu không truyền source, bắn Promise.any để đua tốc độ 2 bên
      if (!source) {
        try {
          const result = await Promise.any([
            fetch(`${API_VSMOV}/phim/${slug}`, {
              next: { revalidate: 300 },
            }).then((res) => {
              if (!res.ok) throw new Error("VSMOV 404");
              return res.json();
            }),

            fetch(`${API_PHIMAPI}/phim/${slug}`, {
              next: { revalidate: 300 },
            }).then((res) => {
              if (!res.ok) throw new Error("PhimAPI 404");
              return res.json();
            }),
          ]);
          return result;
        } catch {
          return undefined;
        }
      }
    } catch {
      console.error("❌ Lỗi tải chi tiết phim:", slug);
      return undefined;
    }
  },
};
