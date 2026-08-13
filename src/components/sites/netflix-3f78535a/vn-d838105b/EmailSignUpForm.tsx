import { ChevronRightIcon } from './icons';

export const EmailSignUpForm = () => {
  return (
    <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-8">
      <div className="relative w-full max-w-md">
        <input
          type="email"
          placeholder="Email address"
          className="w-full bg-black/50 border border-white/50 text-white p-4 rounded focus:outline-none focus:border-white transition"
        />
        <label className="absolute top-4 left-4 text-white/70 pointer-events-none transition-all duration-200">
          Email address
        </label>
      </div>
      <button className="bg-netflix-red text-white px-8 py-4 rounded text-xl font-semibold flex items-center gap-2 hover:bg-red-700 transition">
        Bắt đầu <ChevronRightIcon />
      </button>
    </div>
  );
};
