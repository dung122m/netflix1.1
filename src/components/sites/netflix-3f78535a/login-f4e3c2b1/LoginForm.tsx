import { NetflixLogo } from '../vn-d838105b/icons';

export const LoginForm = () => {
  return (
    <div className="bg-black/75 p-16 rounded-md w-full max-w-md">
      <h1 className="text-3xl font-bold text-white mb-8">Đăng nhập</h1>
      <form className="flex flex-col gap-4">
        <input type="email" placeholder="Email hoặc số điện thoại" className="bg-[#333] text-white p-4 rounded w-full" />
        <input type="password" placeholder="Mật khẩu" className="bg-[#333] text-white p-4 rounded w-full" />
        <button className="bg-netflix-red text-white p-4 rounded font-bold mt-4">Đăng nhập</button>
      </form>
      <div className="text-white/60 mt-4 text-sm">
        <input type="checkbox" className="mr-2" /> Ghi nhớ tôi
      </div>
    </div>
  );
};
