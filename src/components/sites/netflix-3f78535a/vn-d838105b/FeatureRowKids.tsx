export const FeatureRowKids = () => {
  return (
    <section className="bg-black py-20 px-8 md:px-16 flex flex-col-reverse md:flex-row items-center justify-center border-t-8 border-gray-800">
      <div className="md:w-1/2 relative">
        <div className="bg-gray-800 w-full h-80 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Kids Image Placeholder</span>
        </div>
      </div>
      <div className="md:w-1/2 text-white md:pl-16">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Tạo hồ sơ cho trẻ em</h2>
        <p className="text-xl md:text-2xl">
          Đưa trẻ em vào những cuộc phiêu lưu với nhân vật yêu thích của chúng trong một không gian chỉ dành riêng cho trẻ.
        </p>
      </div>
    </section>
  );
};
