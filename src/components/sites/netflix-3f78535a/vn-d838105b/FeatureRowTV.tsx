export const FeatureRowTV = () => {
  return (
    <section className="bg-black py-20 px-8 md:px-16 flex flex-col md:flex-row items-center justify-center border-t-8 border-gray-800">
      <div className="md:w-1/2 text-white">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Thưởng thức trên TV của bạn</h2>
        <p className="text-xl md:text-2xl">
          Xem trên TV thông minh, Playstation, Xbox, Chromecast, Apple TV, đầu phát Blu-ray và nhiều thiết bị khác.
        </p>
      </div>
      <div className="md:w-1/2 relative">
        {/* Placeholder for TV image and video */}
        <div className="bg-gray-800 w-full h-80 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">TV Image Placeholder</span>
        </div>
      </div>
    </section>
  );
};
