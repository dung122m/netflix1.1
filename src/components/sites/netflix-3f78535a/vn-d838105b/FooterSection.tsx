export const FooterSection = () => {
  return (
    <footer className="bg-black py-16 px-8 text-gray-400 border-t-8 border-gray-800">
      <div className="max-w-5xl mx-auto">
        <p className="mb-8">Bạn có câu hỏi? Liên hệ với chúng tôi.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm underline">
          <a href="#">Câu hỏi thường gặp</a>
          <a href="#">Trung tâm trợ giúp</a>
          <a href="#">Điều khoản sử dụng</a>
          <a href="#">Quyền riêng tư</a>
        </div>
        <p className="mt-8">Netflix Việt Nam</p>
      </div>
    </footer>
  );
};
