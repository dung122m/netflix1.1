/**
 * Cấu hình danh sách Quản Trị Viên (Admin) của Nanaflix
 */
export const ADMIN_EMAILS: string[] = [
  "dungtran122cq@gmail.com",
];

/**
 * Kiểm tra xem một địa chỉ email có quyền Quản Trị Viên hay không
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase().trim() === cleanEmail);
}
