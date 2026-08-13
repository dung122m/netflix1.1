export const FAQSection = () => {
  const faqs = [
    { q: "Netflix là gì?", a: "Netflix là một dịch vụ phát trực tuyến..." },
    { q: "Chi phí của Netflix là bao nhiêu?", a: "Xem Netflix trên điện thoại..." },
  ];

  return (
    <section className="bg-black py-20 px-8 border-t-8 border-gray-800">
      <h2 className="text-4xl md:text-5xl font-extrabold text-white text-center mb-12">Câu hỏi thường gặp</h2>
      <div className="max-w-3xl mx-auto">
        {faqs.map((faq, i) => (
          <div key={i} className="mb-2">
            <button className="w-full flex justify-between items-center bg-gray-800 p-6 text-white text-xl md:text-2xl hover:bg-gray-700 transition">
              {faq.q}
              <span>+</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
