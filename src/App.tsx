import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Work {
  id: string;
  title: string;
  title_clean?: string;
  episode: number;
  status?: string;
  has_fire_emoji?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 맨 앞에 '신규' 탭 포함 (총 12개 탭)
const STATUS_TABS = [
  { id: 'NEW', label: '신규' },
  { id: 'ALL', label: '전체' },
  { id: '본거_완결', label: '본거-완결' },
  { id: '본거_시즌완결', label: '본거-시즌완결' },
  { id: '본거_연재중', label: '본거-연재중' },
  { id: '본거_휴재', label: '본거-휴재' },
  { id: '완결', label: '완결' },
  { id: '시즌 완결', label: '시즌 완결' },
  { id: '연재중', label: '연재중' },
  { id: '휴재', label: '휴재' },
  { id: '100회 미만', label: '100회 미만' },
  { id: '휴지통', label: '휴지통' },
];

type SortOption = 'title_asc' | 'title_desc' | 'ep_desc' | 'ep_asc';

export default function App() {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('NEW');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('title_asc');

  // DB에서 데이터 로드
  const fetchWorks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .order('title', { ascending: true });

      if (error) {
        console.error('데이터 로드 실패:', error.message);
      } else if (data) {
        setWorks(data as Work[]);
      }
    } catch (err) {
      console.error('에러 발생:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  // 회차 증감 및 불꽃(🔥) 제거 로직
  const updateEpisode = async (id: string, currentEp: number, delta: number) => {
    const nextEp = Math.max(0, currentEp + delta);
    const shouldRemoveFire = delta > 0;

    setWorks((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              episode: nextEp,
              has_fire_emoji: shouldRemoveFire ? false : item.has_fire_emoji,
            }
          : item
      )
    );

    const updateData: { episode: number; has_fire_emoji?: boolean } = { episode: nextEp };
    if (shouldRemoveFire) {
      updateData.has_fire_emoji = false;
    }

    const { error } = await supabase
      .from('works')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('업데이트 실패:', error.message);
      fetchWorks();
    }
  };

  const cleanStr = (str: string) => str.replace(/\s+/g, '').toLowerCase();

  // 필터링 및 정렬
  const filteredAndSortedWorks = useMemo(() => {
    const now = new Date().getTime();
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

    const filtered = works.filter((work) => {
      // 1. 신규 탭 조건: 14일 이내이면서 불꽃(has_fire_emoji)이 켜져 있는 경우만
      if (selectedStatus === 'NEW') {
        if (!work.has_fire_emoji) return false; // 회차 올리거나 불꽃 꺼지면 즉시 제외

        const dateStr = work.created_at || work.updated_at;
        if (!dateStr) return false;

        const workDate = new Date(dateStr).getTime();
        const isWithinTwoWeeks = now - workDate <= TWO_WEEKS_MS;

        if (!isWithinTwoWeeks) return false;
      } 
      // 2. 다른 상태 탭 조건
      else if (selectedStatus !== 'ALL') {
        const targetStatus = selectedStatus.replace(/\s+/g, '');
        const currentWorkStatus = (work.status || '').replace(/\s+/g, '');
        if (currentWorkStatus !== targetStatus) return false;
      }

      // 3. 검색어 매칭
      if (searchQuery.trim()) {
        const query = cleanStr(searchQuery);
        const titleMatch = cleanStr(work.title || '').includes(query);
        const statusClean = cleanStr(work.status || '');
        const statusMatch =
          statusClean === query || statusClean.replace('_', '-') === query;

        return titleMatch || statusMatch;
      }

      return true;
    });

    // 정렬
    return filtered.sort((a, b) => {
      if (sortOption === 'title_asc') {
        return a.title.localeCompare(b.title, 'ko');
      } else if (sortOption === 'title_desc') {
        return b.title.localeCompare(a.title, 'ko');
      } else if (sortOption === 'ep_desc') {
        return b.episode - a.episode;
      } else if (sortOption === 'ep_asc') {
        return a.episode - b.episode;
      }
      return 0;
    });
  }, [works, selectedStatus, searchQuery, sortOption]);

  const formatStatusLabel = (status?: string) => {
    if (!status) return '기타';
    return status.replace('_', '-');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-md mx-auto flex flex-col justify-between">
      <div>
        {/* 헤더 */}
        <header className="mb-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            📚 웹툰 관리 시스템
          </h1>
          <span className="text-xs px-2.5 py-1 bg-slate-800 rounded-full text-slate-400 border border-slate-700">
            총 {filteredAndSortedWorks.length}개 / {works.length}개
          </span>
        </header>

        {/* 검색창 & 정렬 드롭다운 */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            placeholder="제목/상태 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors min-w-0"
          />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-blue-500 transition-colors shrink-0 cursor-pointer"
          >
            <option value="title_asc">이름 (ㄱ-ㅎ)</option>
            <option value="title_desc">이름 (ㅎ-ㄱ)</option>
            <option value="ep_desc">회차 높은순</option>
            <option value="ep_asc">회차 낮은순</option>
          </select>
        </div>

        {/* 12개 가로 스크롤 상태 탭 */}
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none snap-x text-xs">
          {STATUS_TABS.map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-all snap-start border ${
                  isActive
                    ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-lg shadow-blue-900/40 scale-105'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 웹툰 목록 */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            데이터를 불러오는 중입니다...
          </div>
        ) : filteredAndSortedWorks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            해당하는 작품이 없습니다.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredAndSortedWorks.map((work) => (
              <div
                key={work.id}
                className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-3.5 flex items-center justify-between shadow-md hover:border-slate-600 transition-all"
              >
                <div className="flex-1 pr-2 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-100 truncate text-sm">
                      {work.title}
                    </span>
                    {work.has_fire_emoji && (
                      <span className="text-xs shrink-0">🔥</span>
                    )}
                  </div>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                        work.status?.startsWith('본거')
                          ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                          : work.status === '연재중'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                          : work.status === '휴재'
                          ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                          : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                      }`}
                    >
                      {formatStatusLabel(work.status)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-blue-400 min-w-[42px] text-right">
                    {work.episode}화
                  </span>
                  <div className="flex items-center bg-slate-900/80 rounded-lg p-0.5 border border-slate-700/80">
                    <button
                      onClick={() => updateEpisode(work.id, work.episode, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white active:bg-slate-700 font-bold transition-colors"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateEpisode(work.id, work.episode, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-blue-400 hover:bg-slate-800 hover:text-blue-300 active:bg-slate-700 font-bold transition-colors"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 관리 버튼 */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 w-full max-w-md mx-auto">
        <button
          onClick={() => alert('신규 등록 기능 준비 중입니다.')}
          className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl py-2.5 text-xs font-medium transition-all shadow-sm"
        >
          🔒 신규 등록
        </button>
        <button
          onClick={() => alert('이동/수정 기능 준비 중입니다.')}
          className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl py-2.5 text-xs font-medium transition-all shadow-sm"
        >
          🔒 이동 / 수정
        </button>
        <button
          onClick={() => alert('삭제 기능 준비 중입니다.')}
          className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl py-2.5 text-xs font-medium transition-all shadow-sm"
        >
          🗑️ 작품 삭제
        </button>
      </div>
    </div>
  );
}
