"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MessageSquare,
  Users,
  FolderHeart,
  BarChart2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isUserAdmin } from "@/lib/adminConfig";
import {
  AdminTab,
  VALID_ADMIN_TABS,
  formatAdminDate,
  formatWatchMinutes,
} from "./adminUtils";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import { AdminAccessDenied } from "./components/AdminAccessDenied";
import { AdminHeader, AdminMetricsGrid } from "./components/AdminHeaderAndMetrics";
import { AdminCommentsTab } from "./components/AdminCommentsTab";
import { AdminMembersTab } from "./components/AdminMembersTab";
import { AdminCollectionsTab } from "./components/AdminCollectionsTab";
import { AdminMemberDetailModal } from "./components/AdminMemberDetailModal";
import { AdminCleanResultModal } from "./components/AdminCleanResultModal";
import { AdminAnalyticsTab } from "./components/AdminAnalyticsTab";

function AdminDashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const resolvedTab: AdminTab = useMemo(() => {
    if (tabParam && (VALID_ADMIN_TABS as readonly string[]).includes(tabParam)) {
      return tabParam as AdminTab;
    }
    return "comments";
  }, [tabParam]);

  const [activeTab, setActiveTab] = useState<AdminTab>(resolvedTab);

  // Synchronize active tab when URL changes (e.g. Browser Back/Forward)
  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const handleTabChange = useCallback(
    (newTab: AdminTab) => {
      setActiveTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, searchParams, router]
  );

  const isAdmin = useMemo(() => isUserAdmin(user?.email), [user?.email]);

  const {
    comments,
    collections,
    totalMemberCount,
    loadingData,
    searchQuery,
    setSearchQuery,
    starFilter,
    setStarFilter,
    spoilerFilter,
    setSpoilerFilter,
    flaggedFilter,
    setFlaggedFilter,
    sortBy,
    setSortBy,
    memberSearchQuery,
    setMemberSearchQuery,
    memberFilter,
    setMemberFilter,
    memberSortBy,
    setMemberSortBy,
    selectedMember,
    setSelectedMember,
    memberHistory,
    memberWatchlist,
    loadingMemberDetails,
    copiedUid,
    colSearchQuery,
    setColSearchQuery,
    isCleaning,
    cleanResultModal,
    setCleanResultModal,
    isManualRefreshing,
    isSyncingEmbeddings,
    allMembers,
    filteredMembers,
    metrics,
    filteredComments,
    filteredCollections,
    handleManualRefresh,
    handleUnflagComment,
    handleToggleUserCommentBan,
    handleAutoCleanComments,
    handlePurgeAllFlagged,
    handleDeleteComment,
    handleDeleteAllUserComments,
    handleDeleteCollection,
    handleOpenMemberDetails,
    handleSyncEmbeddings,
    copyToClipboard,
  } = useAdminDashboard({ user, isAdmin, activeTab });

  // 1. Loading Auth State
  if (authLoading) {
    return (
      <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-zinc-400">Đang xác thực quyền Quản trị viên...</p>
      </div>
    );
  }

  // 2. Access Denied State (Not logged in or not admin)
  if (!user || !isAdmin) {
    return (
      <AdminAccessDenied
        userEmail={user?.email}
        hasUser={Boolean(user)}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
      />
    );
  }

  // 3. Authorized Admin Dashboard View
  return (
    <div className="min-h-dvh bg-[#0a0a0c] text-white pt-6 sm:pt-16 md:pt-20 pb-20 sm:pb-24 px-3 sm:px-6 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <AdminHeader
          userEmail={user.email}
          isManualRefreshing={isManualRefreshing}
          isSyncingEmbeddings={isSyncingEmbeddings}
          onManualRefresh={handleManualRefresh}
          onSyncEmbeddings={handleSyncEmbeddings}
        />

        <AdminMetricsGrid
          metrics={metrics}
          totalMemberCount={totalMemberCount}
        />

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto no-scrollbar scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => handleTabChange("comments")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "comments"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <MessageSquare size={14} />
            <span>Bình Luận</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-sans tabular-nums">
              {comments.length}
            </span>
            {metrics.flaggedCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold animate-pulse">
                {metrics.flaggedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("members")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "members"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users size={14} />
            <span>Thành Viên</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-sans tabular-nums">
              {totalMemberCount === null ? "—" : totalMemberCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("collections")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "collections"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <FolderHeart size={14} />
            <span>Bộ Sưu Tập</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-sans tabular-nums">
              {collections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("analytics")}
            className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex-shrink-0 whitespace-nowrap ${
              activeTab === "analytics"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <BarChart2 size={14} />
            <span>Phân Tích</span>
          </button>
        </div>

        {/* TAB 1: COMMENTS MANAGEMENT */}
        {activeTab === "comments" && (
          <AdminCommentsTab
            filteredComments={filteredComments}
            totalCommentsCount={comments.length}
            loadingData={loadingData}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            starFilter={starFilter}
            setStarFilter={setStarFilter}
            spoilerFilter={spoilerFilter}
            setSpoilerFilter={setSpoilerFilter}
            flaggedFilter={flaggedFilter}
            setFlaggedFilter={setFlaggedFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            flaggedCount={metrics.flaggedCount}
            isCleaning={isCleaning}
            allMembers={allMembers}
            onAutoCleanComments={handleAutoCleanComments}
            onPurgeAllFlagged={handlePurgeAllFlagged}
            onUnflagComment={handleUnflagComment}
            onToggleUserCommentBan={handleToggleUserCommentBan}
            onDeleteComment={handleDeleteComment}
            formatDate={formatAdminDate}
          />
        )}

        {/* TAB 2: MEMBERS DIRECTORY */}
        {activeTab === "members" && (
          <AdminMembersTab
            memberSearchQuery={memberSearchQuery}
            setMemberSearchQuery={setMemberSearchQuery}
            memberFilter={memberFilter}
            setMemberFilter={setMemberFilter}
            totalMemberCount={totalMemberCount}
            memberSortBy={memberSortBy}
            setMemberSortBy={setMemberSortBy}
            filteredMembers={filteredMembers}
            copiedUid={copiedUid}
            copyToClipboard={copyToClipboard}
            formatDate={formatAdminDate}
            formatWatchMinutes={formatWatchMinutes}
            onOpenMemberDetails={handleOpenMemberDetails}
            onToggleUserCommentBan={handleToggleUserCommentBan}
            onDeleteAllUserComments={handleDeleteAllUserComments}
          />
        )}

        {/* TAB 3: PUBLIC COLLECTIONS */}
        {activeTab === "collections" && (
          <AdminCollectionsTab
            filteredCollections={filteredCollections}
            colSearchQuery={colSearchQuery}
            setColSearchQuery={setColSearchQuery}
            onDeleteCollection={handleDeleteCollection}
            formatDate={formatAdminDate}
          />
        )}

        {/* TAB 4: ANALYTICS & INSIGHTS */}
        {activeTab === "analytics" && (
          <AdminAnalyticsTab
            metrics={metrics}
            adminEmail={user.email}
            totalMembersCount={totalMemberCount ?? 0}
          />
        )}

        {/* MODAL: MEMBER ACTIVITY DETAILS */}
        <AdminMemberDetailModal
          selectedMember={selectedMember}
          onClose={() => setSelectedMember(null)}
          comments={comments}
          memberHistory={memberHistory}
          memberWatchlist={memberWatchlist}
          loadingMemberDetails={loadingMemberDetails}
          onToggleCommentBan={handleToggleUserCommentBan}
          onDeleteComment={handleDeleteComment}
          onUnflagComment={handleUnflagComment}
          formatDate={formatAdminDate}
        />

        {/* MODAL: AUTO-CLEAN SCAN RESULTS AUDIT */}
        <AdminCleanResultModal
          cleanResult={cleanResultModal}
          onClose={() => setCleanResultModal(null)}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full border-4 border-netflix-red border-t-transparent animate-spin mb-4" />
          <p className="text-sm font-medium text-zinc-400">Đang tải bảng điều khiển Quản trị viên...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
