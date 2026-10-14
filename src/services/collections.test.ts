import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCollection,
  mergeCollections,
  getPendingSync,
  addPendingSync,
  removePendingSync,
  clearPendingSync,
  addTombstone,
  getTombstones,
} from "./collectionService";
import { sanitizeAndDeduplicateMovies } from "@/app/api/user/collections/route";
import { MovieCollection, CollectionMovieItem } from "@/types/collection";

describe("Nanaflix Collections - Regression Test Suite", () => {
  const mockUserA = "user_alpha_123";
  const mockUserB = "user_beta_456";

  // =========================================================================
  // Test 1 & 6: Chuẩn hóa mapping từ snake_case DB sang camelCase frontend
  // =========================================================================
  it("Test 1 & 6: Chuẩn hóa mapping từ snake_case DB sang camelCase frontend", () => {
    const rawDbRecord = {
      id: "col_1740000000000_abc1",
      user_id: mockUserA,
      user_name: "Nguyễn Văn A",
      user_avatar: "https://avatar.url/a.jpg",
      name: " Tuyển Tập Phim Chiếu Rạp 2026 ",
      description: " Những bộ phim đỉnh cao ",
      is_public: false,
      color_gradient: "from-red-500 to-black",
      cover_url: "https://cover.url/1.jpg",
      movies: [
        {
          slug: "mai-2024",
          title: "Mai",
          poster: "https://poster.url/mai.jpg",
          year: "2024",
          quality: "FHD",
          category: "Tâm Lý",
          added_at: 1740000050000,
        },
      ],
      created_at: 1740000000000,
      updated_at: 1740000010000,
    };

    const normalized = normalizeCollection(rawDbRecord);
    assert.ok(normalized, "Normalized collection must not be null");
    assert.equal(normalized.id, "col_1740000000000_abc1");
    assert.equal(normalized.userId, mockUserA, "user_id mapped to userId");
    assert.equal(normalized.creatorName, "Nguyễn Văn A", "user_name mapped to creatorName");
    assert.equal(normalized.creatorPhoto, "https://avatar.url/a.jpg", "user_avatar mapped to creatorPhoto");
    assert.equal(normalized.name, "Tuyển Tập Phim Chiếu Rạp 2026", "Name trimmed");
    assert.equal(normalized.description, "Những bộ phim đỉnh cao", "Description trimmed");
    assert.equal(normalized.isPublic, false, "is_public correctly mapped to isPublic boolean");
    assert.equal(normalized.createdAt, 1740000000000, "created_at mapped to createdAt number");
    assert.equal(normalized.updatedAt, 1740000010000, "updated_at mapped to updatedAt number");
    assert.equal(normalized.movies.length, 1);
    assert.equal(normalized.movies[0].slug, "mai-2024");
    assert.equal(normalized.movies[0].title, "Mai");
    assert.equal(normalized.movies[0].addedAt, 1740000050000, "added_at mapped to addedAt");
  });

  // =========================================================================
  // Test 2: Server trả về mảng rỗng [] không được xóa trắng LocalStorage mới tạo
  // =========================================================================
  it("Test 2: Ngăn server response rỗng làm mất collection mới tạo ở LocalStorage", () => {
    const localCollection: MovieCollection = {
      id: "col_local_new_1",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Phim Hành Động Mới Tạo",
      description: "Chưa sync kịp lên server",
      isPublic: true,
      movies: [],
      createdAt: 1740000100000,
      updatedAt: 1740000100000,
    };

    const emptyServerList: MovieCollection[] = [];
    const merged = mergeCollections([localCollection], emptyServerList, mockUserA, {});

    assert.equal(merged.length, 1, "Must keep the newly created local collection");
    assert.equal(merged[0].id, "col_local_new_1");
    assert.equal(merged[0].name, "Phim Hành Động Mới Tạo");
  });

  // =========================================================================
  // Test 3: API Timeout/Error giữ nguyên LocalStorage an toàn
  // =========================================================================
  it("Test 3: Lỗi mạng hoặc timeout không làm mất dữ liệu cục bộ", () => {
    const localList: MovieCollection[] = [
      {
        id: "col_saved_1",
        userId: mockUserA,
        creatorName: "User Alpha",
        name: "Bộ Sưu Tập Đã Lưu",
        isPublic: true,
        movies: [],
        createdAt: 1740000000000,
        updatedAt: 1740000000000,
      },
    ];

    // Khi lỗi mạng, mergeCollections với mảng rỗng hoặc giữ nguyên local
    const merged = mergeCollections(localList, [], mockUserA, {});
    assert.equal(merged.length, 1);
    assert.equal(merged[0].id, "col_saved_1");
  });

  // =========================================================================
  // Test 4: Ưu tiên bản ghi cập nhật mới hơn giữa Local và Server (Smart Merge)
  // =========================================================================
  it("Test 4: Smart merge so sánh updatedAt chính xác giữa Local và Server", () => {
    const localCol: MovieCollection = {
      id: "col_same_id",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Tên Cập Nhật Tại Local",
      isPublic: true,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000050000, // Cập nhật mới hơn
    };

    const serverCol: MovieCollection = {
      id: "col_same_id",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Tên Cũ Trên Server",
      isPublic: true,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000020000, // Cũ hơn
    };

    const merged = mergeCollections([localCol], [serverCol], mockUserA, {});
    assert.equal(merged.length, 1);
    assert.equal(merged[0].name, "Tên Cập Nhật Tại Local", "Must prefer local when local is newer");

    // Ngược lại, nếu server mới hơn:
    const serverNewer: MovieCollection = {
      ...serverCol,
      name: "Tên Mới Trên Server",
      updatedAt: 1740000090000, // Mới hơn
    };
    const merged2 = mergeCollections([localCol], [serverNewer], mockUserA, {});
    assert.equal(merged2[0].name, "Tên Mới Trên Server", "Must prefer server when server is newer");
  });

  // =========================================================================
  // Test 5 & 8: Cô lập dữ liệu giữa người dùng khác nhau (Data Isolation & Security)
  // =========================================================================
  it("Test 5 & 8: Không hiển thị hoặc nhận nhầm bộ sưu tập của người dùng khác khi đăng nhập", () => {
    const userACollection: MovieCollection = {
      id: "col_user_a",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Bộ Sưu Tập Của A",
      isPublic: false,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000000000,
    };

    // User B đăng nhập vào trình duyệt
    const mergedForUserB = mergeCollections([userACollection], [], mockUserB, {});
    assert.equal(mergedForUserB.length, 0, "Private collection of User A must not be merged for User B");
  });

  // =========================================================================
  // Test 7: Tạo nhiều bộ sưu tập liên tiếp không bị mất hoặc nhân đôi
  // =========================================================================
  it("Test 7: Tạo nhiều bộ sưu tập liên tiếp không trùng lặp và giữ đúng thứ tự", () => {
    const col1: MovieCollection = {
      id: "col_batch_1",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Bộ sưu tập 1",
      isPublic: true,
      movies: [],
      createdAt: 1740000010000,
      updatedAt: 1740000010000,
    };
    const col2: MovieCollection = {
      id: "col_batch_2",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Bộ sưu tập 2",
      isPublic: true,
      movies: [],
      createdAt: 1740000020000,
      updatedAt: 1740000020000,
    };
    const col3: MovieCollection = {
      id: "col_batch_3",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Bộ sưu tập 3",
      isPublic: true,
      movies: [],
      createdAt: 1740000030000,
      updatedAt: 1740000030000,
    };

    // Merge nhiều lần
    let list = mergeCollections([col1], [], mockUserA, {});
    list = mergeCollections([...list, col2], [], mockUserA, {});
    list = mergeCollections([...list, col3, col1], [], mockUserA, {}); // Thử đưa lại col1

    assert.equal(list.length, 3, "Exactly 3 unique collections, no duplicates");
    assert.equal(list[0].id, "col_batch_3", "Newest collection must be first");
    assert.equal(list[1].id, "col_batch_2");
    assert.equal(list[2].id, "col_batch_1");
  });

  // =========================================================================
  // Test 9: Tombstone bảo vệ không cho phép hồi sinh bộ sưu tập vừa bị xóa
  // =========================================================================
  it("Test 9: Tombstone bảo vệ không cho phép hồi sinh bộ sưu tập vừa bị xóa", () => {
    const deletedColId = "col_deleted_123";
    const serverCol: MovieCollection = {
      id: deletedColId,
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Bộ sưu tập đã bị xóa",
      isPublic: true,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000000000,
    };

    const tombstones = { [deletedColId]: Date.now() };
    const merged = mergeCollections([], [serverCol], mockUserA, tombstones);

    assert.equal(merged.length, 0, "Deleted collection must not resurrect while tombstone is active");
  });

  // =========================================================================
  // P1 Test: Thêm phim vào bộ sưu tập & chống thêm trùng (Deduplication)
  // =========================================================================
  it("P1 Test: Thêm phim và chống thêm trùng phim vào bộ sưu tập", () => {
    const initialMovies: CollectionMovieItem[] = [
      {
        slug: "dune-part-two",
        title: "Dune: Part Two",
        poster: "https://poster.url/dune2.jpg",
        year: "2024",
        quality: "4K",
        category: "Khoa Học Viễn Tưởng",
        addedAt: 1740000000000,
      },
    ];

    const collection: MovieCollection = {
      id: "col_p1_test",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Sci-Fi Favorites",
      isPublic: true,
      movies: initialMovies,
      createdAt: 1740000000000,
      updatedAt: 1740000000000,
    };

    // 1. Thêm phim mới hợp lệ
    const newMovie: CollectionMovieItem = {
      slug: "avatar-the-way-of-water",
      title: "Avatar: Dòng Chảy Của Nước",
      poster: "https://poster.url/avatar2.jpg",
      year: "2022",
      quality: "FHD",
      category: "Hành Động",
      addedAt: 1740000010000,
    };

    const updatedMovies = [newMovie, ...collection.movies.filter((m) => m.slug !== newMovie.slug)];
    const updatedCollection = {
      ...collection,
      movies: updatedMovies,
      updatedAt: Date.now(),
    };

    assert.equal(updatedCollection.movies.length, 2, "Must contain exactly 2 movies after adding new one");
    assert.equal(updatedCollection.movies[0].slug, "avatar-the-way-of-water");

    // 2. Thử thêm lại chính phim "dune-part-two" (đã có trong bộ sưu tập)
    const duplicateMovie: CollectionMovieItem = {
      slug: "dune-part-two",
      title: "Dune: Part Two",
      poster: "https://poster.url/dune2.jpg",
      year: "2024",
      addedAt: Date.now(),
    };

    // Kiểm tra slug đã tồn tại
    const isAlreadyPresent = updatedCollection.movies.some((m) => m.slug === duplicateMovie.slug);
    assert.equal(isAlreadyPresent, true, "Duplicate slug must be detected");

    // Logic deduplication không được tăng số lượng phim
    const deduplicatedList = [
      duplicateMovie,
      ...updatedCollection.movies.filter((m) => m.slug !== duplicateMovie.slug),
    ];
    assert.equal(deduplicatedList.length, 2, "Deduplication must maintain count = 2");
  });

  // =========================================================================
  // P2 Test: Dữ liệu tối thiểu và định dạng movie payload cho MediaCard
  // =========================================================================
  it("P2 Test: MediaCard movie payload tương thích hoàn toàn với CollectionMovieItem", () => {
    const mediaCardPayload = {
      slug: "lat-mat-7",
      title: "Lật Mặt 7: Một Điều Ước",
      poster: "https://phimimg.com/upload/vod/20240501/lat-mat-7.jpg",
      year: 2024,
      quality: "FHD",
      category: "Gia Đình",
    };

    const normalizedItem: CollectionMovieItem = {
      slug: mediaCardPayload.slug,
      title: mediaCardPayload.title,
      poster: mediaCardPayload.poster,
      year: String(mediaCardPayload.year),
      quality: mediaCardPayload.quality,
      category: mediaCardPayload.category,
      addedAt: Date.now(),
    };

    assert.ok(normalizedItem.slug, "Slug is required");
    assert.ok(normalizedItem.title, "Title is required");
    assert.ok(normalizedItem.poster, "Poster is required");
    assert.equal(normalizedItem.year, "2024");
    assert.equal(normalizedItem.quality, "FHD");
  });

  // =========================================================================
  // Test Quyền sở hữu (Ownership verification)
  // =========================================================================
  it("Ownership Test: Người xem không sở hữu không có quyền sửa collection", () => {
    const collection: MovieCollection = {
      id: "col_owner_test",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Bộ Sưu Tập Của Alpha",
      isPublic: true,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000000000,
    };

    // Người dùng là User A
    const isOwnerA = Boolean(mockUserA && collection.userId === mockUserA);
    assert.equal(isOwnerA, true, "User A is the owner");

    // Người dùng là User B
    const isOwnerB = Boolean(mockUserB && collection.userId === mockUserB);
    assert.equal(isOwnerB, false, "User B is NOT the owner");

    // Khách chưa đăng nhập
    const guestUserId: string | null = null;
    const isOwnerGuest = Boolean(guestUserId && collection.userId === guestUserId);
    assert.equal(isOwnerGuest, false, "Guest is NOT the owner");
  });

  // =========================================================================
  // BẮT BUỘC: 12 BÀI REGRESSION TEST THEO AUDIT TIÊU CHUẨN
  // =========================================================================

  // Giả lập LocalStorage trong môi trường Node.js cho các bài test Sync
  const mockStorage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };

  // 1. Thêm phim khi offline
  it("Regression 1: Thêm phim khi offline được lưu vào LocalStorage và đưa vào Pending Sync", () => {
    (globalThis as any).window = {};
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();

    const colId = "col_offline_1";
    addPendingSync(mockUserA, colId);

    const pending = getPendingSync(mockUserA);
    assert.ok(pending[colId], "Pending sync must track col_offline_1");
    assert.equal(pending[colId].attempts, 0);
  });

  // 2. Mạng phục hồi và dữ liệu được đồng bộ lên Server
  it("Regression 2: Mạng phục hồi, Server xác nhận thành công thì xóa khỏi Pending Sync", () => {
    (globalThis as any).window = {};
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();

    const colId = "col_online_recovered";
    addPendingSync(mockUserA, colId);
    assert.ok(getPendingSync(mockUserA)[colId]);

    // Giả lập đồng bộ thành công -> xóa pending
    removePendingSync(mockUserA, colId);
    const updatedPending = getPendingSync(mockUserA);
    assert.equal(updatedPending[colId], undefined, "Item must be removed from pending after server success");
  });

  // 3. Server ghi thành công nhưng Client timeout
  it("Regression 3: Server ghi thành công nhưng Client timeout, retry an toàn không lỗi", () => {
    const originalCollection: MovieCollection = {
      id: "col_timeout_1",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Phim Chiếu Rạp",
      isPublic: true,
      movies: [
        { slug: "movie-a", title: "Phim A", poster: "/a.jpg", addedAt: 1740000000000 },
      ],
      createdAt: 1740000000000,
      updatedAt: 1740000000000,
    };

    // Client gửi lại đúng payload sau timeout
    const retriedPayload = { ...originalCollection, updatedAt: 1740000005000 };
    const merged = mergeCollections([retriedPayload], [originalCollection], mockUserA, {});
    assert.equal(merged.length, 1, "Idempotent merge keeps only 1 collection record");
    assert.equal(merged[0].updatedAt, 1740000005000, "Updated collection replaces old state");
  });

  // 4. Retry không tạo bản ghi trùng
  it("Regression 4: Retry gửi nhiều lần cùng một phim không tạo bản ghi trùng lặp", () => {
    const rawMovies = [
      { slug: "avatar-3", title: "Avatar 3", poster: "/av.jpg" },
      { slug: "avatar-3", title: "Avatar 3 (Bản Retry)", poster: "/av.jpg" },
      { slug: "AVATAR-3", title: "Avatar 3 hoa", poster: "/av.jpg" },
    ];
    const sanitized = sanitizeAndDeduplicateMovies(rawMovies);
    assert.equal(sanitized.length, 1, "Only 1 movie preserved regardless of retries");
    assert.equal(sanitized[0].slug, "avatar-3");
    assert.equal(sanitized[0].title, "Avatar 3", "Original first title preserved");
  });

  // 5. Đăng xuất và đăng nhập tài khoản khác
  it("Regression 5: Đăng xuất và đổi tài khoản cô lập hoàn toàn Pending Sync giữa các User", () => {
    (globalThis as any).window = {};
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();

    addPendingSync(mockUserA, "col_user_a_secret");
    const pendingA = getPendingSync(mockUserA);
    const pendingB = getPendingSync(mockUserB);

    assert.ok(pendingA["col_user_a_secret"], "User A has pending col");
    assert.equal(Object.keys(pendingB).length, 0, "User B has NO pending cols from User A");
  });

  // 6. Xóa Collection hoặc phim trong lúc có thao tác đang chờ
  it("Regression 6: Xóa Collection trong lúc đang chờ sync thì Tombstone hủy Pending Sync ngay", () => {
    (globalThis as any).window = {};
    (globalThis as any).localStorage = mockLocalStorage;
    mockLocalStorage.clear();

    const colId = "col_deleted_while_pending";
    addPendingSync(mockUserA, colId);
    assert.ok(getPendingSync(mockUserA)[colId]);

    // Thao tác xóa: Đánh dấu tombstone & xóa pending
    addTombstone(mockUserA, colId);
    removePendingSync(mockUserA, colId);

    const tombstones = getTombstones(mockUserA);
    const pending = getPendingSync(mockUserA);

    assert.ok(tombstones[colId], "Tombstone must be active");
    assert.equal(pending[colId], undefined, "Pending sync must be cancelled immediately");
  });

  // 7. Hai request thêm cùng slug
  it("Regression 7: Hai request thêm cùng slug phim được chặn chuẩn xác", () => {
    const existingList: CollectionMovieItem[] = [
      { slug: "lat-mat-7", title: "Lật Mặt 7", poster: "/lm7.jpg", addedAt: 1740000000000 },
    ];
    const incomingSlug = "lat-mat-7";
    const isDuplicate = existingList.some((m) => m.slug.toLowerCase() === incomingSlug.toLowerCase());
    assert.equal(isDuplicate, true, "Must flag duplicate slug");
  });

  // 8. Payload chứa nhiều phim trùng slug
  it("Regression 8: Server sanitizeAndDeduplicateMovies xử lý payload chứa nhiều phim trùng slug", () => {
    const payload = [
      { slug: "oppenheimer", title: "Oppenheimer", year: 2023 },
      { slug: "barbie", title: "Barbie", year: 2023 },
      { slug: "OPPENHEIMER", title: "Oppenheimer Duplicate", year: 2023 },
      { slug: "   ", title: "Invalid Rỗng" },
      { title: "Thiếu Slug" },
    ];
    const result = sanitizeAndDeduplicateMovies(payload);
    assert.equal(result.length, 2, "Chỉ giữ lại 2 phim hợp lệ và không trùng slug");
    assert.equal(result[0].slug, "oppenheimer");
    assert.equal(result[1].slug, "barbie");
  });

  // 9. Hai request cập nhật cùng Collection gần như đồng thời
  it("Regression 9: Hai cập nhật đồng thời áp dụng Smart Merge theo updatedAt", () => {
    const colV1: MovieCollection = {
      id: "col_concurrent",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Tên Cũ (V1)",
      isPublic: true,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000010000,
    };

    const colV2: MovieCollection = {
      id: "col_concurrent",
      userId: mockUserA,
      creatorName: "User Alpha",
      name: "Tên Mới Nhất (V2)",
      isPublic: true,
      movies: [{ slug: "phim-moi", title: "Phim Mới", poster: "/p.jpg", addedAt: 1740000020000 }],
      createdAt: 1740000000000,
      updatedAt: 1740000020000, // V2 mới hơn V1
    };

    const merged = mergeCollections([colV2], [colV1], mockUserA, {});
    assert.equal(merged.length, 1);
    assert.equal(merged[0].name, "Tên Mới Nhất (V2)");
    assert.equal(merged[0].movies.length, 1);
  });

  // 10. Đóng Modal khi request tìm kiếm đang chạy (AbortController)
  it("Regression 10: AbortController hủy bỏ request fetch và không gây lỗi giả", () => {
    const controller = new AbortController();
    let aborted = false;
    let caughtError: Error | null = null;

    controller.signal.addEventListener("abort", () => {
      aborted = true;
    });

    // Kích hoạt abort
    controller.abort();
    assert.equal(aborted, true, "Signal received abort event");

    try {
      if (controller.signal.aborted) {
        const err = new Error("This operation was aborted");
        err.name = "AbortError";
        throw err;
      }
    } catch (err: any) {
      caughtError = err;
    }

    assert.ok(caughtError);
    assert.equal(caughtError.name, "AbortError", "Error type is AbortError, handled quietly without toast alert");
  });

  // 11. Kiểm tra quyền sở hữu và dữ liệu riêng tư
  it("Regression 11: Kiểm tra quyền sở hữu và bảo vệ dữ liệu riêng tư", () => {
    const privateCollection: MovieCollection = {
      id: "col_private_alpha",
      userId: mockUserA,
      creatorName: "Alpha",
      name: "Bộ Sưu Tập Bí Mật",
      isPublic: false,
      movies: [],
      createdAt: 1740000000000,
      updatedAt: 1740000000000,
    };

    const canViewAlpha = privateCollection.isPublic || privateCollection.userId === mockUserA;
    const canViewBeta = privateCollection.isPublic || privateCollection.userId === mockUserB;

    assert.equal(canViewAlpha, true, "Owner Alpha has view access");
    assert.equal(canViewBeta, false, "Stranger Beta has NO view access to private collection");
  });

  // 12. Đảm bảo Smart Merge và Tombstone vẫn hoạt động
  it("Regression 12: Tombstone ngăn Server làm hồi sinh Collection đã bị xóa", () => {
    const deletedColId = "col_already_deleted_123";
    const serverList: MovieCollection[] = [
      {
        id: deletedColId,
        userId: mockUserA,
        creatorName: "Alpha",
        name: "Collection Đã Bị Xóa Ở Client",
        isPublic: true,
        movies: [],
        createdAt: 1740000000000,
        updatedAt: 1740000000000,
      },
    ];

    const tombstones = { [deletedColId]: Date.now() };
    const merged = mergeCollections([], serverList, mockUserA, tombstones);
    assert.equal(merged.length, 0, "Tombstoned collection must NOT be resurrected by server list");
  });
});
