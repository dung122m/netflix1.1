export const FeatureRowWatch = () => {
  return (
    <section className="bg-black py-20 px-8 md:px-16 flex flex-col md:flex-row items-center justify-center border-t-8 border-gray-800">
      <div className="md:w-1/2 text-white">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Xem ở mọi nơi</h2>
        <p className="text-xl md:text-2xl">
          Phát trực tuyến không giới hạn phim và chương trình truyền hình trên điện thoại, máy tính bảng, máy tính xách tay và TV của bạn.
        </p>
      </div>
      <div className="md:w-1/2 relative">
        <div className="bg-gray-800 w-full h-80 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Device Image Placeholder</span>
        </div>
      </div>
    </section>
  );
};
