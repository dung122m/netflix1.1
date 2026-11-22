"use client";

import React from "react";
import { ArrowLeft, Loader2, Search, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useNavSearch, type SearchSuggestion } from "./hooks/useNavSearch";
import { SearchDropdownPanel } from "./SearchDropdownPanel";

export type { SearchSuggestion };

interface NavSearchBarProps {
  isSearchExpanded: boolean;
  setIsSearchExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMobileSearch?: () => void;
}

export const NavSearchBar: React.FC<NavSearchBarProps> = React.memo(
  function NavSearchBar({
    isSearchExpanded,
    setIsSearchExpanded,
    onOpenMobileSearch,
  }) {
    const {
      queryText,
      hasSearchText,
      hasDropdownContent,
      suggestions,
      isSearching,
      showDropdown,
      setShowDropdown,
      selectedSuggestionIndex,
      recentSearches,
      inputRef,
      mobileInputRef,
      searchContainerRef,
      mobileSearchRef,
      handleInputChange,
      handleInputKeyDown,
      handleSearchSubmit,
      handleRecentClick,
      removeRecentSearch,
      clearAllRecentSearches,
      clearSearch,
      toggleSearch,
      handleSuggestionSelect,
      closeMobileOverlay,
    } = useNavSearch({
      isSearchExpanded,
      setIsSearchExpanded,
      onOpenMobileSearch,
    });

    const isSearchOpen = isSearchExpanded;

    return (
      <>
        {/* FULL-WIDTH MOBILE SEARCH OVERLAY */}
        {isSearchOpen && (
          <div
            ref={mobileSearchRef}
            className="md:hidden absolute inset-0 bg-black/98 px-2.5 sm:px-4 py-2 flex items-center gap-2 z-50 animate-in fade-in duration-150 border-b border-white/[0.08] shadow-2xl"
          >
            <button
              type="button"
              onClick={closeMobileOverlay}
              aria-label="Đóng tìm kiếm"
              className="p-1.5 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>

            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 flex items-center bg-zinc-900/90 rounded-full px-3 py-1.5 shadow-inner min-w-0"
            >
              <button
                type={hasSearchText ? "submit" : "button"}
                onClick={
                  hasSearchText
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                        mobileInputRef.current?.focus();
                      }
                }
                aria-label="Tìm kiếm ngay"
                className="text-zinc-300 hover:text-white mr-2 flex-shrink-0 cursor-pointer"
              >
                <Search size={16} />
              </button>

              <input
                ref={mobileInputRef}
                type="text"
                placeholder="Tìm phim, diễn viên, anime..."
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-transparent text-white text-base sm:text-sm outline-none placeholder:text-zinc-400 min-w-0"
              />

              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                {isSearching && (
                  <Loader2 size={15} className="animate-spin text-netflix-red" />
                )}
                {hasSearchText && (
                  <Tooltip content="Xóa nội dung" side="bottom">
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label="Xóa nội dung tìm kiếm"
                      className="p-1 text-zinc-400 hover:text-white transition cursor-pointer rounded-full hover:bg-white/10"
                    >
                      <X size={16} />
                    </button>
                  </Tooltip>
                )}
              </div>
            </form>

            {/* MOBILE SEARCH DROPDOWN */}
            {showDropdown && hasDropdownContent && (
              <SearchDropdownPanel
                variant="mobile"
                queryText={queryText}
                hasSearchText={hasSearchText}
                isSearching={isSearching}
                suggestions={suggestions}
                recentSearches={recentSearches}
                selectedSuggestionIndex={selectedSuggestionIndex}
                onRecentClick={handleRecentClick}
                onRemoveRecent={removeRecentSearch}
                onClearAllRecent={clearAllRecentSearches}
                onSuggestionSelect={handleSuggestionSelect}
                onSubmitSearch={handleSearchSubmit}
              />
            )}
          </div>
        )}

        {/* MOBILE SEARCH TRIGGER BUTTON */}
        <button
          type="button"
          onClick={toggleSearch}
          aria-label="Tìm kiếm phim"
          className="md:hidden flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition cursor-pointer flex-shrink-0 active:scale-95"
        >
          <Search size={16} />
        </button>

        {/* DESKTOP SEARCH BAR */}
        <div
          ref={searchContainerRef}
          className="relative hidden md:block flex-shrink-0"
        >
          <form
            onSubmit={handleSearchSubmit}
            className={`flex items-center transition-[width,background-color,border-color,box-shadow] duration-300 ease-out rounded-full ${
              isSearchOpen
                ? "w-[260px] lg:w-[300px] xl:w-[340px] border border-white/30 bg-black/90 px-3 py-1.5 backdrop-blur-md shadow-lg"
                : "w-9 border border-transparent bg-transparent px-1 py-1"
            }`}
          >
            <Tooltip
              content={
                isSearchOpen && hasSearchText ? "Tìm kiếm ngay" : "Tìm kiếm"
              }
              shortcut={!isSearchOpen ? "Ctrl+K" : undefined}
              side="bottom"
            >
              <button
                type={isSearchOpen && hasSearchText ? "submit" : "button"}
                onClick={isSearchOpen && hasSearchText ? undefined : toggleSearch}
                aria-label={
                  isSearchOpen && hasSearchText
                    ? "Tìm kiếm phim"
                    : "Mở thanh tìm kiếm"
                }
                className="text-zinc-300 hover:text-white transition flex-shrink-0 cursor-pointer p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <Search size={17} />
              </button>
            </Tooltip>

            <div
              className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${
                isSearchOpen
                  ? "opacity-100 ml-2 pointer-events-auto"
                  : "opacity-0 w-0 pointer-events-none"
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm phim trên Nanaflix..."
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setShowDropdown(true)}
                className="w-full bg-transparent text-white text-base sm:text-sm outline-none placeholder:text-zinc-400"
              />
            </div>

            {isSearchOpen && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {isSearching && (
                  <Loader2 size={14} className="animate-spin text-netflix-red" />
                )}
                {hasSearchText && (
                  <Tooltip content="Xóa nội dung" side="bottom">
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label="Xóa nội dung tìm kiếm"
                      className="p-1 text-zinc-400 hover:text-white transition flex-shrink-0 cursor-pointer rounded-full hover:bg-white/10"
                    >
                      <X size={15} />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </form>

          {/* DESKTOP SEARCH DROPDOWN */}
          {showDropdown && hasDropdownContent && (
            <SearchDropdownPanel
              variant="desktop"
              queryText={queryText}
              hasSearchText={hasSearchText}
              isSearching={isSearching}
              suggestions={suggestions}
              recentSearches={recentSearches}
              selectedSuggestionIndex={selectedSuggestionIndex}
              onRecentClick={handleRecentClick}
              onRemoveRecent={removeRecentSearch}
              onClearAllRecent={clearAllRecentSearches}
              onSuggestionSelect={handleSuggestionSelect}
              onSubmitSearch={handleSearchSubmit}
            />
          )}
        </div>
      </>
    );
  },
);
