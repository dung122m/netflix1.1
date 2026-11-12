import { uploadAvatarSupabase } from "@/services/supabaseService";

export interface AvatarUploadUser {
  uid: string;
  getIdToken: () => Promise<string>;
}

// Image compression
export function compressImage(
  file: File,
  maxSize: number = 200,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error("Lỗi đọc file ảnh!"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file!"));
    reader.readAsDataURL(file);
  });
}

export async function uploadUserAvatarFile(
  user: AvatarUploadUser | null,
  file: File
): Promise<string> {
  let finalUrl = "";

  // 1. Tải ảnh trực tiếp lên Supabase Storage qua Server API Admin
  if (user) {
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.avatarUrl) {
        finalUrl = data.avatarUrl;
      } else {
        console.warn("[Avatar Upload] API server trả lỗi:", data?.error);
      }
    } catch (apiErr) {
      console.warn("[Avatar Upload] Lỗi gọi API server:", apiErr);
    }
  }

  // 2. Fallback dự phòng: nén ảnh và dùng client upload / base64 nếu API lỗi
  if (!finalUrl) {
    const compressedDataUrl = await compressImage(file, 200, 0.85);
    finalUrl = compressedDataUrl;
    if (user?.uid) {
      try {
        const cloudUrl = await uploadAvatarSupabase(user.uid, file);
        if (cloudUrl) {
          finalUrl = cloudUrl;
        }
      } catch {}
    }
  }

  return finalUrl;
}

