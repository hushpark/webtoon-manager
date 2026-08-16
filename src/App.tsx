import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
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

// 12개 상태 탭 (맨 앞 '신규' 포함)
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
  
  // 조회/검색 관련 상태
  const [selectedStatus, setSelectedStatus] = useState<string>('NEW');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [episodeInput, setEpisodeInput] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('title_asc');

  // Supabase DB 불러오기
  const fetchWorks = async (): Promise<void> => {
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  // 회차 증감 및 불꽃(🔥) 제거
  const updateEpisode = async (id: string, currentEp: number, delta: number): Promise<void> => {
    const nextEp = Math.max(0, currentEp + delta);
    const shouldRemoveFire = delta > 0;

    // 선반영
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

  const cleanStr = (str: string): string => str.replace(/\s+/g, '').toLowerCase();

  // 🔍 조회 목록 필터링 및 정렬 로직
  const filteredAndSortedWorks = useMemo(() => {
    const now = new Date().getTime();
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

    const filtered = works.filter((work) => {
      // 1. 신규 탭: 14일 이내 & 불꽃(has_fire_emoji)이 살아있는 경우만
      if (selectedStatus === 'NEW') {
        if (!work.has_fire_emoji) return false;

        const dateStr = work.created_at || work.updated_at;
        if (!dateStr) return false;

        const workDate = new Date(dateStr).getTime();
        if (now - workDate > TWO_WEEKS_MS) return false;
      } 
      // 2. 상태 탭 개별 정밀 구분
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

    // 4. 정렬 (이름/회차)
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

  const formatStatusLabel = (status?: string): string => {
    if (!status) return '기타';
    return status.replace('_', '-');
  };

  return (
    <div className="min-h-screen bg-[#0d1322] text-slate-800 p-4 max-w-xl mx-auto flex flex-col gap-4 font-sans">
      
      {/* 1. 작품 제목 입력 상자 */}
      <div className="bg-white rounded-2xl p-5 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-blue-600 font-bold text-sm">1. 작품 제목 입력</h2>
          <span className="text-slate-400 text-xs">타이핑 시 자동완성</span>
        </div>
        <div className="relative mb-2">
          <span className="absolute left-3.5 top-3 text-blue-500 font-bold text-base">🔍</span>
          <input
            type="text"
            placeholder="작품 제목을 입력하세요..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
          />
        </div>
        <p className="text-[11px] text-slate-400">
          제목을 입력하세요. (핫키: Alt+1 신규등록, Alt+2 수정, Esc 초기화)
        </p>
      </div>

      {/* 2. 회차 (Episode) 및 분류 선택 상자 */}
      <div className="bg-white rounded-2xl p-5 shadow-lg">
        <label className="block text-slate-700 font-bold text-xs mb-2">회차 (Episode)</label>
        <input
          type="text"
          placeholder="숫자 입력"
          value={episodeInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEpisodeInput(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm mb-3 focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-slate-400"
        />
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-700 font-bold text-xs">분류 선택</span>
          <span className="text-slate-400 text-[11px]">버튼 클릭</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-400">
          작품 검색 완료 후 선택할 수 있는 분류 버튼이 활성화됩니다.
        </div>
      </div>

      {/* 3. 전체 작품 목록 카드 */}
      <div className="bg-white rounded-2xl p-5 shadow-lg">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
            <span className="text-blue-500">📚</span> 전체 작품 목록 ({filteredAndSortedWorks.length})
          </div>
          <select
            value={sortOption}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortOption(e.target.value as SortOption)}
            className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="title_asc">이름 (ㄱ-ㅎ)</option>
            <option value="title_desc">이름 (ㅎ-ㄱ)</option>
            <option value="ep_desc">회차 높은순</option>
            <option value="ep_asc">회차 낮은순</option>
          </select>
        </div>

        {/* 12개 가로 스크롤 상태 탭 */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-none snap-x bg-slate-100 p-1 rounded-xl text-xs">
          {STATUS_TABS.map((tab) => {
            const isActive = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all snap-start ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 작품 리스트 */}
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            데이터를 불러오는 중입니다...
          </div>
        ) : filteredAndSortedWorks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            해당하는 작품이 없습니다.
          </div>
        ) : (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filteredAndSortedWorks.map((work) => (
              <div
                key={work.id}
                className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-xs hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                  <span className="font-bold text-slate-800 text-xs truncate">
                    {work.title}
                  </span>
                  {work.has_fire_emoji && (
                    <span className="text-xs shrink-0">🔥</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-blue-600 min-w-[36px] text-right">
                    {work.episode}화
                  </span>
                  <button
                    onClick={() => updateEpisode(work.id, work.episode, 1)}
                    className="border border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all active:scale-95"
                  >
                    + 1
                  </button>
                  <span className="border border-slate-200 bg-slate-50 text-slate-500 text-[11px] px-2 py-1 rounded-lg min-w-[64px] text-center">
                    {formatStatusLabel(work.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 관리 버튼 3개 */}
      <div className="grid grid-cols-3 gap-2 w-full">
        <button
          onClick={() => alert('신규 등록 기능 준비 중입니다.')}
          className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl py-3 text-xs font-semibold transition-all shadow-sm active:scale-98"
        >
          🔒 신규 등록
        </button>
        <button
          onClick={() => alert('이동/수정 기능 준비 중입니다.')}
          className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl py-3 text-xs font-semibold transition-all shadow-sm active:scale-98"
        >
          🔒 이동 / 수정
        </button>
        <button
          onClick={() => alert('삭제 기능 준비 중입니다.')}
          className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl py-3 text-xs font-semibold transition-all shadow-sm active:scale-98"
        >
          🗑️ 작품 삭제
        </button>
      </div>

    </div>
  );
}
