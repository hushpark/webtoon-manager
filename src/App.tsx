import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { WorkStatus, Work as BaseWork, SearchState, ThemeType } from './types';
import { THEME_STYLES } from './theme';
import { 
  Search, PlusCircle, ArrowRightLeft, RotateCcw, 
  Lock, BookOpen, AlertCircle, Clock, Sparkles, X, Flame, Layers, Plus, Palette, Check, Trash2
} from 'lucide-react';

// TypeScript 빌드 에러 방지를 위한 Work 타입 확장 (created_at, updated_at 추가)
export interface Work extends BaseWork {
  created_at?: string;
  updated_at?: string;
}

const NEW_WORK_STATUS_OPTIONS: WorkStatus[] = [
  '연재중', '완결', '시즌 완결', '휴재', '100회 미만', '휴지통'
];

const UPDATE_STATUS_BUTTONS = [
  '본거', '연재중', '완결', '시즌 완결', '휴재', '100회 미만', '휴지통'
] as const;

type UpdateButtonType = typeof UPDATE_STATUS_BUTTONS[number];

// 12개 상세 상태 탭 정의 (맨 앞 '신규' 포함)
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
  const [searchInput, setSearchInput] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ type: 'IDLE' });
  const [selectedStatus, setSelectedStatus] = useState<WorkStatus | ''>('');
  const [selectedRawButton, setSelectedRawButton] = useState<string>('');
  const [episodeInput, setEpisodeInput] = useState<number | ''>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading] = useState(false);
  
  // 실시간 유사 작품 드롭다운용 상태
  const [suggestions, setSuggestions] = useState<Work[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeType>('COBALT');
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  
  // 목록 필터 탭 & 정렬 옵션 상태
  const [activeTab, setActiveTab] = useState<string>('NEW');
  const [sortOption, setSortOption] = useState<SortOption>('title_asc');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const cleanTitle = (str: string) => str.replace(/\s+/g, '').toLowerCase();

  const fetchAllWorks = async () => {
    const { data } = await supabase.from('works').select('*').order('updated_at', { ascending: false });
    if (data) setAllWorks(data as Work[]);
  };

  useEffect(() => {
    fetchAllWorks();
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReset();
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        handleRegister();
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        handleMoveOrUpdate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchState, selectedStatus, episodeInput, searchInput]);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => handleReset(), 5 * 60 * 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSearchInput('');
    setSearchState({ type: 'IDLE' });
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedStatus('');
    setSelectedRawButton('');
    setEpisodeInput('');
    setErrorMessage(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // 실시간 입력 타이핑에 따른 유사 작품 자동 검색
  const handleInputChange = (value: string) => {
    setSearchInput(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchState({ type: 'IDLE' });
      setSelectedStatus('');
      setSelectedRawButton('');
      setEpisodeInput('');
      return;
    }

    const cleaned = cleanTitle(trimmed);
    const matches = allWorks.filter(w => cleanTitle(w.title).includes(cleaned));

    setSuggestions(matches);
    setShowSuggestions(true);

    const exact = matches.find(w => cleanTitle(w.title) === cleaned);
    if (exact) {
      setSearchState({ type: 'EXACT_MATCH', work: exact });
      setEpisodeInput(exact.episode);
      setSelectedStatus(exact.status as WorkStatus);
      setSelectedRawButton(exact.status);
    } else if (matches.length > 0) {
      setSearchState({ type: 'PARTIAL_MATCH', candidates: matches });
      setSelectedStatus('');
      setSelectedRawButton('');
      setEpisodeInput('');
    } else {
      setSearchState({ type: 'NEW_WORK', query: trimmed });
      setSelectedStatus('');
      setSelectedRawButton('');
      setEpisodeInput('');
    }
  };

  const handleSelectSuggestion = (work: Work) => {
    setSearchInput(work.title);
    setShowSuggestions(false);
    setSearchState({ type: 'EXACT_MATCH', work });
    setEpisodeInput(work.episode);
    setSelectedStatus(work.status as WorkStatus);
    setSelectedRawButton(work.status);
    setLogs((prev) => Array.from(new Set([work.title, ...prev])).slice(0, 10));
    resetTimer();
  };

  const executeSearch = (query: string) => {
    setShowSuggestions(false);
    const trimmed = query.trim();
    if (!trimmed) {
      handleReset();
      return;
    }

    resetTimer();
    setLogs((prev) => Array.from(new Set([trimmed, ...prev])).slice(0, 10));
    const cleaned = cleanTitle(trimmed);
    const exact = allWorks.find((w) => cleanTitle(w.title) === cleaned);

    if (exact) {
      setSearchState({ type: 'EXACT_MATCH', work: exact });
      setEpisodeInput(exact.episode);
      setSelectedStatus(exact.status as WorkStatus);
      setSelectedRawButton(exact.status);
    } else {
      const matches = allWorks.filter(w => cleanTitle(w.title).includes(cleaned));
      if (matches.length > 0) {
        setSearchState({ type: 'PARTIAL_MATCH', candidates: matches });
      } else {
        setSearchState({ type: 'NEW_WORK', query: trimmed });
      }
    }
  };

  const handleSelectUpdateStatus = (btn: UpdateButtonType) => {
    setSelectedRawButton(btn);

    if (btn === '본거') {
      if (searchState.type === 'EXACT_MATCH') {
        const currentStatus = searchState.work.status;

        if (currentStatus.startsWith('본거_')) {
          setSelectedStatus(currentStatus as WorkStatus);
          return;
        }

        if (currentStatus === '연재중') setSelectedStatus('본거_연재중' as WorkStatus);
        else if (currentStatus === '완결') setSelectedStatus('본거_완결' as WorkStatus);
        else if (currentStatus === '시즌 완결') setSelectedStatus('본거_시즌완결' as WorkStatus);
        else if (currentStatus === '휴재') setSelectedStatus('본거_휴재' as WorkStatus);
        else {
          setSelectedStatus('본거_완결' as WorkStatus);
        }
      } else {
        setErrorMessage('⚠️ 작품을 선택한 상태에서만 [본거] 지정이 가능합니다.');
      }
    } else {
      setSelectedStatus(btn as WorkStatus);
    }
  };

  const handleRegister = async () => {
    if (searchState.type !== 'NEW_WORK') {
      setErrorMessage('⚠️ 미등록 신규 작품 상태일 때만 등록이 가능합니다.');
      return;
    }
    if (!selectedStatus) {
      setErrorMessage('⚠️ 분류 상태를 선택해 주세요.');
      return;
    }

    const title = searchInput.trim();
    const hasFire = ['완결', '시즌 완결', '연재중', '휴재', '100회 미만'].includes(selectedStatus);

    const { error } = await supabase.from('works').insert({
      title,
      title_clean: cleanTitle(title),
      episode: Number(episodeInput) || 0,
      status: selectedStatus,
      has_fire_emoji: hasFire
    });

    if (!error) {
      alert(`✅ 신규 등록 완료: [${selectedStatus}]`);
      handleReset();
      fetchAllWorks();
    } else {
      setErrorMessage('등록에 실패했습니다.');
    }
  };

  const handleMoveOrUpdate = async () => {
    if (searchState.type !== 'EXACT_MATCH') {
      setErrorMessage('⚠️ 등록된 작품 검색 상태일 때만 수정이 가능합니다.');
      return;
    }
    if (!selectedStatus) {
      setErrorMessage('⚠️ 이동할 분류 상태를 선택해 주세요.');
      return;
    }

    const currentWork = searchState.work;

    const { error } = await supabase
      .from('works')
      .update({
        status: selectedStatus,
        episode: Number(episodeInput) || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentWork.id);

    if (!error) {
      alert(`✅ 상태 이동 및 수정 완료 ➡️ [${selectedStatus}]`);
      handleReset();
      fetchAllWorks();
    } else {
      setErrorMessage('수정에 실패했습니다.');
    }
  };

  const handleDeleteWork = async () => {
    if (searchState.type !== 'EXACT_MATCH') {
      setErrorMessage('⚠️ 삭제할 작품을 검색하여 선택해 주세요.');
      return;
    }

    const currentWork = searchState.work;

    if (window.confirm(`⚠️ '${currentWork.title}' 작품을 정말로 데이터베이스에서 완전히 삭제하시겠습니까?`)) {
      const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', currentWork.id);

      if (!error) {
        alert(`🗑️ '${currentWork.title}' 작품이 완전히 삭제되었습니다.`);
        handleReset();
        fetchAllWorks();
      } else {
        setErrorMessage('삭제에 실패했습니다.');
      }
    }
  };

  // 빠른 회차 증가 (+1 클릭 시 불꽃 제거)
  const handleQuickIncrementEpisode = async (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextEp = work.episode + 1;
    
    const { error } = await supabase
      .from('works')
      .update({ 
        episode: nextEp, 
        has_fire_emoji: false,
        updated_at: new Date().toISOString() 
      })
      .eq('id', work.id);

    if (!error) {
      fetchAllWorks();
      if (searchState.type === 'EXACT_MATCH' && searchState.work.id === work.id) {
        setEpisodeInput(nextEp);
      }
    }
  };

  const themeStyles = THEME_STYLES[currentTheme];

  const getEpisodeBadgeColor = (ep: number | '') => {
    const num = Number(ep);
    if (!num) return 'bg-white text-slate-800 border-slate-300';
    if (num >= 300) return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    if (num >= 200) return 'bg-rose-100 text-rose-900 border-rose-300 font-semibold';
    if (num >= 100) return 'bg-emerald-100 text-emerald-950 border-emerald-300 font-semibold';
    return 'bg-slate-50 text-slate-800 border-slate-300';
  };

  // 🔍 12개 상태 탭 필터링 및 정렬 로직 (created_at, updated_at 완벽 연동)
  const filteredAndSortedWorks = useMemo(() => {
    const now = new Date().getTime();
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

    const filtered = allWorks.filter((work) => {
      // 1. 신규 탭: 14일 이내 & 불꽃(has_fire_emoji)이 켜져 있는 작품만
      if (activeTab === 'NEW') {
        if (!work.has_fire_emoji) return false;

        const dateStr = work.created_at || work.updated_at;
        if (!dateStr) return false;

        const workDate = new Date(dateStr).getTime();
        if (now - workDate > TWO_WEEKS_MS) return false;
      }
      // 2. 전체 탭
      else if (activeTab === 'ALL') {
        return true;
      }
      // 3. 개별 상태 탭 (엄격 매칭)
      else {
        const targetStatus = activeTab.replace(/\s+/g, '');
        const currentWorkStatus = (work.status || '').replace(/\s+/g, '');
        if (currentWorkStatus !== targetStatus) return false;
      }

      return true;
    });

    // 정렬 (이름/회차 오름차순/내림차순)
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
  }, [allWorks, activeTab, sortOption]);

  const formatStatusLabel = (status?: string) => {
    if (!status) return '기타';
    return status.replace('_', '-');
  };

  return (
    <div className={`min-h-screen ${themeStyles.bg} text-slate-800 pb-28 transition-colors duration-300`}>
      
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 ${themeStyles.headerBg} rounded-xl text-white shadow-md transition-colors`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">웹툰 관리 시스템</h1>
            <span className="text-[11px] text-slate-500 font-medium">실시간 메타 데이터 관리</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1">
            <Palette className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value as ThemeType)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="COBALT">🩵 코발트</option>
              <option value="VIOLET">💜 바이올렛</option>
              <option value="NATURE">🌿 네이처</option>
              <option value="CHARCOAL">🩶 차콜</option>
            </select>
          </div>

          <button 
            onClick={handleReset}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 border border-slate-200"
            title="초기화 (Esc)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-3.5 sm:p-6 space-y-4">
        
        {/* 1. 작품 검색 입력 */}
        <section className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-4 shadow-sm space-y-3 transition-colors relative`}>
          <div className="flex justify-between items-center">
            <label className={`text-xs font-bold uppercase tracking-wider ${themeStyles.accentText}`}>
              1. 작품 제목 입력
            </label>
            <span className="text-[11px] text-slate-400">타이핑 시 자동완성</span>
          </div>

          <div className="relative" ref={searchBoxRef}>
            <input
              ref={searchInputRef}
              type="text"
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all"
              placeholder="작품 제목을 입력하세요..."
              value={searchInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => searchInput.trim() && setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch(searchInput)}
            />
            <Search className={`w-5 h-5 ${themeStyles.accentText} absolute left-3.5 top-4`} />
            {searchInput && (
              <button 
                onClick={handleReset} 
                className="absolute right-3.5 top-3.5 p-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* 실시간 콤보박스 (자동완성 레이어) */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                <div className="p-2 text-[10px] font-bold text-slate-400 bg-slate-50 border-b border-slate-100 uppercase">
                  유사/추천 작품 ({suggestions.length}개)
                </div>
                {suggestions.map((work) => (
                  <div
                    key={work.id}
                    onClick={() => handleSelectSuggestion(work)}
                    className="p-3 hover:bg-indigo-50/80 cursor-pointer border-b border-slate-100 last:border-none flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-sm text-slate-800">{work.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-indigo-600">{work.episode}화</span>
                      <span className="w-22 text-center text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-semibold shrink-0">
                        {formatStatusLabel(work.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 전광판 */}
          <div>
            {loading && (
              <p className={`text-xs font-bold ${themeStyles.accentText} animate-pulse flex items-center gap-1.5 py-1`}>
                <Sparkles className="w-4 h-4" /> DB 스캔 중입니다...
              </p>
            )}

            {!loading && searchState.type === 'IDLE' && (
              <p className="text-xs text-slate-400 py-0.5">제목을 입력하세요. (핫키: Alt+1 신규등록, Alt+2 수정, Esc 초기화)</p>
            )}

            {!loading && searchState.type === 'EXACT_MATCH' && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs sm:text-sm text-blue-900">
                <div className="font-extrabold text-blue-700 text-sm sm:text-base flex items-center justify-between">
                  <span>🔎 '{searchState.work.title}'</span>
                  <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-xs shadow-xs">
                    현재: {formatStatusLabel(searchState.work.status)}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 mt-1">
                  등록되어 있는 작품입니다. 이동할 분류를 아래에서 선택하세요.
                </p>
              </div>
            )}

            {!loading && searchState.type === 'PARTIAL_MATCH' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs sm:text-sm text-amber-900">
                <span className="font-bold">❓ 상단 입력창 레이어에서 일치하는 작품을 클릭해 주세요.</span>
              </div>
            )}

            {!loading && searchState.type === 'NEW_WORK' && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs sm:text-sm text-emerald-900">
                <div className="font-extrabold text-emerald-800 text-sm sm:text-base">
                  ⭕ 미등록 신규 작품입니다.
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  아래에서 회차 및 분류 버튼을 선택한 후 [신규 등록]을 눌러주세요.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 2 & 3. 회차 및 분류 버튼 선택 */}
        <section className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-4 shadow-sm space-y-3 transition-colors`}>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">회차 (Episode)</label>
            <input
              type="number"
              inputMode="numeric"
              className={`w-full p-3 border rounded-xl font-bold text-sm focus:outline-none transition-all ${getEpisodeBadgeColor(episodeInput)}`}
              placeholder="숫자 입력"
              value={episodeInput}
              onChange={(e) => setEpisodeInput(e.target.value ? Number(e.target.value) : '')}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                분류 선택 {selectedStatus && <span className="text-indigo-600 font-extrabold">({formatStatusLabel(selectedStatus)})</span>}
              </label>
              <span className="text-[10px] text-slate-400">버튼 클릭</span>
            </div>

            {searchState.type === 'NEW_WORK' && (
              <div className="grid grid-cols-3 gap-1.5">
                {NEW_WORK_STATUS_OPTIONS.map((opt) => {
                  const isSelected = selectedStatus === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedStatus(opt)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {searchState.type === 'EXACT_MATCH' && (
              <div className="grid grid-cols-3 gap-1.5">
                {UPDATE_STATUS_BUTTONS.map((btn) => {
                  const isSelected = selectedRawButton === btn;
                  return (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleSelectUpdateStatus(btn)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        btn === '본거'
                          ? isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-[1.02]'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                          : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{btn === '본거' ? '⭐ 본거' : btn}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {searchState.type === 'IDLE' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 text-center">
                작품 검색 완료 후 선택할 수 있는 분류 버튼이 활성화됩니다.
              </div>
            )}

            {searchState.type === 'PARTIAL_MATCH' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-center">
                상단 타이핑 콤보박스 레이어에서 이동할 작품을 클릭해 주세요.
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

        {/* 최근 검색 */}
        {logs.length > 0 && (
          <section className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Clock className={`w-3.5 h-3.5 ${themeStyles.accentText}`} />
              <span>최근 검색 기록</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {logs.map((item: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => { setSearchInput(item); executeSearch(item); }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-all active:scale-95 shadow-2xs"
                >
                  #{item}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 📚 12개 상태 탭 & 정렬 옵션이 적용된 작품 목록 영역 */}
        <section className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-4 shadow-sm space-y-3 transition-colors`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Layers className={`w-4 h-4 ${themeStyles.accentText}`} />
              <span>전체 작품 목록 ({filteredAndSortedWorks.length})</span>
            </span>

            {/* 정렬 드롭다운 */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="title_asc">이름 (ㄱ-ㅎ)</option>
              <option value="title_desc">이름 (ㅎ-ㄱ)</option>
              <option value="ep_desc">회차 높은순</option>
              <option value="ep_asc">회차 낮은순</option>
            </select>
          </div>

          {/* 12개 상태 가로 스크롤 탭 바 */}
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none snap-x bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all snap-start ${
                    isActive
                      ? `${themeStyles.headerBg} text-white shadow-xs`
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 작품 목록 세로 리스트 */}
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
            {filteredAndSortedWorks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                해당 분류의 작품이 없습니다.
              </div>
            ) : (
              filteredAndSortedWorks.map((work) => (
                <div 
                  key={work.id}
                  onClick={() => handleSelectSuggestion(work)}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {work.has_fire_emoji && <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />}
                    <span className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-black truncate">{work.title}</span>
                  </div>

                  {/* 우측 항목 고정 정렬 세로 라인 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-14 text-right text-xs font-mono font-bold ${themeStyles.accentText}`}>
                      {work.episode}화
                    </span>
                    
                    <button
                      onClick={(e) => handleQuickIncrementEpisode(work, e)}
                      className="px-2 py-0.5 bg-white hover:bg-slate-800 text-slate-700 hover:text-white text-[11px] font-bold rounded border border-slate-300 transition-all flex items-center gap-0.5 shadow-2xs shrink-0 active:scale-95"
                      title="+1화 빠른 업데이트 (불꽃 제거)"
                    >
                      <Plus className="w-3 h-3" />1
                    </button>

                    <span className="w-22 text-center text-[10px] bg-white border border-slate-200 text-slate-600 px-1 py-0.5 rounded font-semibold truncate shrink-0">
                      {formatStatusLabel(work.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* 하단 고정 스티키 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 z-40 shadow-lg">
        <div className="max-w-xl mx-auto flex gap-2">
          <button
            onClick={handleRegister}
            disabled={searchState.type !== 'NEW_WORK'}
            className={`flex-1 py-3.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md ${
              searchState.type === 'NEW_WORK'
                ? `${themeStyles.secondaryBtn} text-white active:scale-95`
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            {searchState.type !== 'NEW_WORK' ? <Lock className="w-4 h-4 text-slate-400" /> : <PlusCircle className="w-4 h-4" />}
            <span>신규 등록</span>
          </button>

          <button
            onClick={handleMoveOrUpdate}
            disabled={searchState.type !== 'EXACT_MATCH'}
            className={`flex-1 py-3.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md ${
              searchState.type === 'EXACT_MATCH'
                ? `${themeStyles.primaryBtn} text-white active:scale-95`
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            {searchState.type !== 'EXACT_MATCH' ? <Lock className="w-4 h-4 text-slate-400" /> : <ArrowRightLeft className="w-4 h-4" />}
            <span>이동 / 수정</span>
          </button>

          <button
            onClick={handleDeleteWork}
            disabled={searchState.type !== 'EXACT_MATCH'}
            className={`py-3.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md ${
              searchState.type === 'EXACT_MATCH'
                ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title="데이터베이스에서 완전히 삭제"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">작품 삭제</span>
          </button>
        </div>
      </div>
    </div>
  );
}
