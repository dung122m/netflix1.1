/**
 * Cấu hình danh sách Quản Trị Viên (Admin) của Nanaflix
 * Mặc định chứa tài khoản của bạn, đồng thời hỗ trợ mở rộng qua biến môi trường Vercel (nếu muốn)
 */
export const DEFAULT_ADMIN_EMAILS: string[] = [
  "dungtran122cq@gmail.com",
];

export function getAdminEmails(): string[] {
  const envEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS
    ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [];

  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...envEmails]));
}

export const ADMIN_EMAILS: string[] = getAdminEmails();

/**
 * Kiểm tra xem một địa chỉ email có quyền Quản Trị Viên hay không
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  const allAdmins = getAdminEmails();
  return allAdmins.includes(cleanEmail);
}

