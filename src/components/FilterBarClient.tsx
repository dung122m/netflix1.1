"use client";

import dynamic from "next/dynamic";

const FilterBar = dynamic(
  () =>
    import(
      "@/components/sites/netflix-3f78535a/browse-1234abcd/FilterBar"
    ).then((mod) => mod.FilterBar),
  {
    ssr: false,
    loading: () => <div className="mt-20 h-10" aria-hidden="true" />,
  },
);

export function FilterBarClient() {
  return <FilterBar />;
}
