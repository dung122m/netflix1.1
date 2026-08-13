export const mockMovies = [
  {
    id: "1",
    title: "Stranger Things",
    description:
      "When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.",
    genre: "Sci-Fi",
    country: "USA",
    year: 2024,
    duration: "45m",
    imageUrl:
      "https://occ-0-395-325.1.nflxso.net/dnm/api/v6/X194eJsgWBp2aQ9s9qPEXr85-4Q/AAAABYw88J_Kq7-G0K06cR9fR3V8l6M6z0F5V3hG9f5d1x6l7p3s6h0-t0k1i5k3j7n8m4j7l0i1k5k3j7n8m4j7l0i1k5k3.webp",
  },
  {
    id: "2",
    title: "Squid Game",
    description:
      "Hundreds of cash-strapped players accept a strange invitation to compete in children's games. Inside, a tempting prize awaits with deadly high stakes.",
    genre: "Thriller",
    country: "Korea",
    year: 2023,
    duration: "55m",
    imageUrl:
      "https://occ-0-395-325.1.nflxso.net/dnm/api/v6/X194eJsgWBp2aQ9s9qPEXr85-4Q/AAAABc1234567890abcdefghijklmnopqrstuvwxyz.webp",
  },
  {
    id: "3",
    title: "The Witcher",
    description:
      "Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.",
    genre: "Fantasy",
    country: "USA",
    year: 2022,
    duration: "60m",
    imageUrl:
      "https://occ-0-395-325.1.nflxso.net/dnm/api/v6/X194eJsgWBp2aQ9s9qPEXr85-4Q/AAAABd1234567890abcdefghijklmnopqrstuvwxyz.webp",
  },
];

export const getMovieById = (id: string) => mockMovies.find((m) => m.id === id);
export const getFilteredMovies = (
  genre?: string,
  country?: string,
  year?: number,
) => {
  return mockMovies.filter((movie) => {
    return (
      (!genre || movie.genre === genre) &&
      (!country || movie.country === country) &&
      (!year || movie.year === year)
    );
  });
};
