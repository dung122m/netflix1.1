import { HeaderNavbar } from './HeaderNavbar';
import { EmailSignUpForm } from './EmailSignUpForm';
import Image from 'next/image';

export const HeroSection = () => {
  return (
    <div className="relative h-screen bg-black flex flex-col items-center justify-center text-center p-4">
      <div className="absolute inset-0 z-0">
         <Image 
            src="/sites/netflix-3f78535a/vn-d838105b/images/img_1.jpg" 
            alt="Netflix Background"
            fill
            className="object-cover opacity-60"
         />
      </div>
      <div className="absolute inset-0 bg-black/60 z-0"></div>
      <HeaderNavbar />
      <div className="relative z-10 text-white">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
          Chương trình truyền hình, phim không giới hạn và nhiều nội dung khác
        </h1>
        <p className="text-xl md:text-2xl mb-8">
          Xem ở mọi nơi. Hủy bất cứ lúc nào.
        </p>
        <p className="text-lg">
          Bạn đã sẵn sàng xem chưa? Nhập email để tạo hoặc kích hoạt lại tư cách thành viên của bạn.
        </p>
        <EmailSignUpForm />
      </div>
    </div>
  );
};
