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
      selectedSuggestionIndex,
      recentSearches,
      inputRef,
      mobileInputRef,
      searchContainerRef,
      mobileSearchRef,
      handleInputChange,
      handleInputFocus,
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
            className="md:hidden absolute inset-0 bg-black/98 backdrop-blur-2xl px-2.5 sm:px-4 py-2 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] border-b border-white/[0.08] shadow-2xl"
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
                onFocus={handleInputFocus}
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
          className="md:hidden flex items-center justify-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition cursor-pointer flex-shrink-0 active:scale-95"
        >
          <Search size={17} />
        </button>

        {/* DESKTOP SEARCH BAR */}
        <div
          ref={searchContainerRef}
          className="relative hidden md:block flex-shrink-0"
        >
          <form
            onSubmit={handleSearchSubmit}
            className={`relative flex items-center h-9 sm:h-9.5 rounded-full transition-[width,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isSearchOpen
                ? "w-[270px] lg:w-[310px] xl:w-[350px] border border-white/25 bg-black/95 shadow-[0_4px_24px_rgba(0,0,0,0.7)] backdrop-blur-md"
                : "w-9 border border-transparent bg-transparent shadow-none"
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
                className="w-9 h-9 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-netflix-red"
              >
                <Search size={17} />
              </button>
            </Tooltip>

            <div
              className={`flex-1 min-w-0 h-full flex items-center overflow-hidden transition-opacity duration-200 ${
                isSearchOpen
                  ? "opacity-100 pointer-events-auto pr-1"
                  : "opacity-0 pointer-events-none w-0"
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Tìm phim trên Nanaflix..."
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={handleInputFocus}
                className="w-full bg-transparent text-white text-sm outline-none placeholder:text-zinc-400 py-1"
              />
            </div>

            {isSearchOpen && (
              <div className="flex items-center gap-1 pr-2.5 shrink-0 animate-in fade-in duration-150">
                {isSearching && (
                  <Loader2 size={14} className="animate-spin text-netflix-red" />
                )}
                {hasSearchText && (
                  <Tooltip content="Xóa nội dung" side="bottom">
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label="Xóa nội dung tìm kiếm"
                      className="p-1 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer rounded-full hover:bg-white/10"
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
