"use client";

import dynamic from "next/dynamic";

const FilterBar = dynamic(
  () =>
    import(
      "@/components/browse/FilterBar"
    ).then((mod) => mod.FilterBar),
  {
    ssr: false,
    loading: () => <div className="h-10 animate-pulse bg-zinc-900/50 rounded-lg max-w-md" aria-hidden="true" />,
  },
);

export function FilterBarClient() {
  return <FilterBar />;
}
