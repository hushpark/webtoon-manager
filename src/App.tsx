import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { WorkStatus, Work as BaseWork, SearchState, ThemeType } from './types';
import { THEME_STYLES } from './theme';
import { 
  Search, 
  PlusCircle, 
  ArrowRightLeft, 
  RotateCcw, 
  Lock, 
  BookOpen, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  X, 
  Flame, 
  Layers, 
  Plus, 
  Palette, 
  Check, 
  Trash2,
  Copy,
  GripHorizontal,
  Move,
  Bookmark
} from 'lucide-react';

export interface Work extends BaseWork {
  my_episode?: number;
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

type SortOption = 'title_asc' | 'title_desc' | 'ep_desc' | 'ep_asc' | 'err_my_gt_total' | 'diff_my_lt_total';

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ type: 'IDLE' });
  const [selectedStatus, setSelectedStatus] = useState<WorkStatus | ''>('');
  const [selectedRawButton, setSelectedRawButton] = useState<string>('');
  const [episodeInput, setEpisodeInput] = useState<number | ''>('');
  const [myEpisodeInput, setMyEpisodeInput] = useState<number | ''>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading] = useState(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Work[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeType>('COBALT');
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('NEW');
  const [sortOption, setSortOption] = useState<SortOption>('title_asc');

  // 목록 영역 높이 조절
  const [listHeight, setListHeight] = useState(360);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(360);

  // 위치 이동(Floating Drag) 관련 상태
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingBoxRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const cardBoxRef = useRef<HTMLDivElement>(null);

  // 탭 가로 드래그 조작 Ref & State
  const tabsRef = useRef<HTMLDivElement>(null);
  const isDraggingTabRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const cleanTitle = (str: string) => str.replace(/\s+/g, '').toLowerCase();

  const fetchAllWorks = async () => {
    const { data } = await supabase.from('works').select('*').order('updated_at', { ascending: false });
    if (data) setAllWorks(data as Work[]);
  };

  useEffect(() => {
    fetchAllWorks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 단축키 이벤트 (Alt+1, Alt+2, Esc 전용)
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
  }, [searchState, selectedStatus, episodeInput, myEpisodeInput, searchInput]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        const deltaY = e.clientY - startYRef.current;
        const newHeight = Math.max(160, Math.min(800, startHeightRef.current + deltaY));
        setListHeight(newHeight);
      }
      else if (isDraggingBoxRef.current) {
        setPosition({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y
        });
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      isDraggingBoxRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDraggingBox = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'SELECT') return;
    isDraggingBoxRef.current = true;
    
    if (cardBoxRef.current) {
      const rect = cardBoxRef.current.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      if (!position) {
        setPosition({ x: rect.left, y: rect.top });
      }
    }
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  };

  const startResizing = (e: React.MouseEvent) => {
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = listHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

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
    setMyEpisodeInput('');
    setErrorMessage(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

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
      setMyEpisodeInput('');
      return;
    }

    const cleaned = cleanTitle(trimmed);
    const matches = allWorks.filter(w => cleanTitle(w.title).includes(cleaned));

    const sortedMatches = matches.sort((a, b) => {
      const aClean = cleanTitle(a.title);
      const bClean = cleanTitle(b.title);
      const aStartsWith = aClean.startsWith(cleaned);
      const bStartsWith = bClean.startsWith(cleaned);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      return a.title.localeCompare(b.title, 'ko');
    });

    setSuggestions(sortedMatches);
    setShowSuggestions(true);

    if (searchState.type !== 'EXACT_MATCH') {
      const exact = sortedMatches.find(w => cleanTitle(w.title) === cleaned);
      if (exact) {
        setSearchState({ type: 'EXACT_MATCH', work: exact });
        setEpisodeInput(exact.episode);
        setMyEpisodeInput(exact.my_episode !== undefined ? exact.my_episode : 0);
        setSelectedStatus(exact.status as WorkStatus);
        setSelectedRawButton(exact.status);
      } else {
        setSearchState({ type: 'NEW_WORK', query: trimmed });
        setSelectedStatus('');
        setSelectedRawButton('');
        setEpisodeInput('');
        setMyEpisodeInput('');
      }
    }
  };

  const handleSelectSuggestion = (work: Work) => {
    setSearchInput(work.title);
    setShowSuggestions(false);
    setSearchState({ type: 'EXACT_MATCH', work });
    setEpisodeInput(work.episode);
    setMyEpisodeInput(work.my_episode !== undefined ? work.my_episode : 0);
    setSelectedStatus(work.status as WorkStatus);
    setSelectedRawButton(work.status);
    setLogs((prev) => Array.from(new Set([work.title, ...prev])).slice(0, 10));
    resetTimer();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(work.title).then(() => {
        setToastMessage(`📋 '${work.title}' 제목이 복사되었습니다.`);
        setTimeout(() => setToastMessage(null), 2000);
      }).catch(() => {});
    }
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
      setMyEpisodeInput(exact.my_episode !== undefined ? exact.my_episode : 0);
      setSelectedStatus(exact.status as WorkStatus);
      setSelectedRawButton(exact.status);
    } else {
      setSearchState({ type: 'NEW_WORK', query: trimmed });
    }
  };

  const handleSelectUpdateStatus = (btn: UpdateButtonType) => {
    setSelectedRawButton(btn);

    if (btn === '본거') {
      if (episodeInput !== '') {
        setMyEpisodeInput(episodeInput);
      }

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
    const totalEp = Number(episodeInput) || 0;
    
    const myEp = myEpisodeInput !== '' ? Number(myEpisodeInput) : 0;

    const { error } = await supabase.from('works').insert({
      title,
      title_clean: cleanTitle(title),
      episode: totalEp,
      my_episode: myEp,
      status: selectedStatus,
      has_fire_emoji: hasFire
    });

    if (!error) {
      alert(`✅ 신규 등록 완료: '${title}' (${selectedStatus})`);
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
    const newTitle = searchInput.trim();

    if (!newTitle) {
      setErrorMessage('⚠️ 작품 제목을 입력해 주세요.');
      return;
    }

    const totalEp = episodeInput !== '' ? Number(episodeInput) : currentWork.episode;
    const myEp = myEpisodeInput !== '' ? Number(myEpisodeInput) : 0;

    const { error } = await supabase
      .from('works')
      .update({
        title: newTitle,
        title_clean: cleanTitle(newTitle),
        status: selectedStatus,
        episode: totalEp,
        my_episode: myEp,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentWork.id);

    if (!error) {
      alert(`✅ 이동 및 수정 완료: '${currentWork.title}' (${selectedStatus})`);
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

  const handleQuickIncrementMyEpisode = async (work: Work, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMyEp = (work.my_episode || 0) + 1;
    
    const { error } = await supabase
      .from('works')
      .update({ 
        my_episode: nextMyEp, 
        has_fire_emoji: false,
        updated_at: new Date().toISOString() 
      })
      .eq('id', work.id);

    if (!error) {
      fetchAllWorks();
      if (searchState.type === 'EXACT_MATCH' && searchState.work.id === work.id) {
        setMyEpisodeInput(nextMyEp);
      }
    }
  };

  const handleTabMouseDown = (e: React.MouseEvent) => {
    if (!tabsRef.current) return;
    isDraggingTabRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - tabsRef.current.offsetLeft;
    scrollLeftRef.current = tabsRef.current.scrollLeft;
  };

  const handleTabMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabRef.current || !tabsRef.current) return;
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    tabsRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleTabMouseUpOrLeave = () => {
    isDraggingTabRef.current = false;
  };

  const handleTabClick = (tabId: string) => {
    if (hasMovedRef.current) return;
    setActiveTab(tabId);
  };

  const handleTabWheel = (e: React.WheelEvent) => {
    if (!tabsRef.current) return;
    if (e.deltaY !== 0) {
      tabsRef.current.scrollLeft += e.deltaY;
    }
  };

  const themeStyles = THEME_STYLES[currentTheme];

  const filteredAndSortedWorks = useMemo(() => {
    const now = new Date().getTime();
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

    const filtered = allWorks.filter((work) => {
      const myEp = work.my_episode || 0;
      const totalEp = work.episode || 0;

      if (sortOption === 'err_my_gt_total') {
        if (myEp <= totalEp) return false;
      }
      else if (sortOption === 'diff_my_lt_total') {
        if (myEp === 0 || myEp >= totalEp) return false;
      }

      if (activeTab === 'NEW') {
        if (!work.has_fire_emoji) return false;

        const dateStr = work.created_at || work.updated_at;
        if (!dateStr) return false;

        const workDate = new Date(dateStr).getTime();
        if (now - workDate > TWO_WEEKS_MS) return false;
      }
      else if (activeTab === 'ALL') {
        return true;
      }
      else {
        const targetStatus = activeTab.replace(/\s+/g, '');
        const currentWorkStatus = (work.status || '').replace(/\s+/g, '');
        if (currentWorkStatus !== targetStatus) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortOption === 'title_asc') {
        return a.title.localeCompare(b.title, 'ko');
      } else if (sortOption === 'title_desc') {
        return b.title.localeCompare(a.title, 'ko');
      } else if (sortOption === 'ep_desc') {
        return b.episode - a.episode;
      } else if (sortOption === 'ep_asc') {
        return a.episode - b.episode;
      } else if (sortOption === 'err_my_gt_total') {
        return ((b.my_episode || 0) - b.episode) - ((a.my_episode || 0) - a.episode);
      } else if (sortOption === 'diff_my_lt_total') {
        return (b.episode - (b.my_episode || 0)) - (a.episode - (a.my_episode || 0));
      }
      return 0;
    });
  }, [allWorks, activeTab, sortOption]);

  const formatStatusLabel = (status?: string) => {
    if (!status) return '기타';
    return status.replace('_', '-');
  };

  const getEpisodeBoxStyle = (myEp: number, totalEp: number) => {
    if (myEp > totalEp) {
      return 'bg-rose-100 border-rose-400 text-rose-900';
    } 
    if (myEp > 0 && myEp < totalEp) {
      return 'bg-indigo-50/90 border-indigo-200 text-indigo-900';
    }
    return 'bg-white border-slate-200 text-slate-700';
  };

  return (
    <div className={`min-h-screen ${themeStyles.bg} text-slate-800 pb-28 transition-colors duration-300 flex flex-col items-center`}>
      
      {/* 상단 헤더 */}
      <header className="w-full sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
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

      {/* 메인 컨테이너 */}
      <main className="w-full max-w-xl mx-auto p-3.5 sm:p-6 space-y-4 flex-1">
        
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

            {/* 🔍 연관 작품 자동완성 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto">
                <div className="p-2.5 text-xs font-extrabold text-slate-500 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                  <span>연관 작품 ({suggestions.length}개)</span>
                  <span className="text-[10px] text-slate-400 font-normal">가나다순 정렬됨</span>
                </div>
                {suggestions.map((work) => {
                  const myEp = work.my_episode || 0;
                  const totalEp = work.episode || 0;
                  return (
                    <div
                      key={work.id}
                      onClick={() => handleSelectSuggestion(work)}
                      className="p-3 hover:bg-indigo-50/90 cursor-pointer border-b border-slate-100 last:border-none flex items-center justify-between transition-colors gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">{work.title}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div className={`border px-2 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums flex items-center w-[115px] ${getEpisodeBoxStyle(myEp, totalEp)}`}>
                          <span className={`w-12 text-right font-extrabold ${myEp > totalEp ? 'text-rose-700' : 'text-amber-600'}`}>📌{myEp}</span>
                          <span className="w-3 text-center text-slate-300 font-normal">/</span>
                          <span className="w-12 text-right">{totalEp}화</span>
                        </div>

                        <span className="w-16 text-center text-[10px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded font-bold border border-slate-200 truncate whitespace-nowrap">
                          {formatStatusLabel(work.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            {loading && (
              <p className={`text-xs font-bold ${themeStyles.accentText} animate-pulse flex items-center gap-1.5 py-1`}>
                <Sparkles className="w-4 h-4" /> DB 스캔 중입니다...
              </p>
            )}

            {!loading && searchState.type === 'IDLE' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 py-0.5 flex-wrap">
                <span>제목을 입력하세요.</span>
                <span className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1">
                  신규: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Alt+1</kbd>
                </span>
                <span className="inline-flex items-center gap-1">
                  수정: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Alt+2</kbd>
                </span>
                <span className="inline-flex items-center gap-1">
                  초기화: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Esc</kbd>
                </span>
              </div>
            )}

            {!loading && searchState.type === 'EXACT_MATCH' && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs sm:text-sm text-blue-900">
                <div className="font-extrabold text-blue-700 text-sm sm:text-base flex items-center justify-between">
                  <span>🔎 '{searchState.work.title}'</span>
                  <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-xs shadow-xs shrink-0">
                    현재: {formatStatusLabel(searchState.work.status)}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 mt-1 flex items-center gap-1 flex-wrap">
                  <span>제목/회차/관람회차 변경 후</span>
                  <kbd className="px-1.5 py-0.2 bg-blue-100 border border-blue-300 rounded text-[10px] font-mono font-bold text-blue-800">Alt+2</kbd>
                  <span>를 누르면 저장됩니다.</span>
                </p>
              </div>
            )}

            {!loading && searchState.type === 'NEW_WORK' && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs sm:text-sm text-emerald-900">
                <div className="font-extrabold text-emerald-800 text-sm sm:text-base">
                  ⭕ 미등록 신규 작품입니다.
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
                  <span>회차 및 분류 선택 후</span>
                  <kbd className="px-1.5 py-0.2 bg-emerald-100 border border-emerald-300 rounded text-[10px] font-mono font-bold text-emerald-800">Alt+1</kbd>
                  <span>을 누르세요.</span>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* 2 & 3. 회차 및 분류 버튼 선택 */}
        <section className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-4 shadow-sm space-y-3 transition-colors`}>
          
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">최신 회차 (전체)</label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full p-2.5 border border-slate-300 rounded-xl font-extrabold text-base bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
                placeholder="최신화"
                value={episodeInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setEpisodeInput(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>내가 본 회차 (북마크)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                className="w-full p-2.5 border border-amber-400 bg-amber-50/70 rounded-xl font-black text-base text-amber-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-amber-400"
                placeholder="보던 위치"
                value={myEpisodeInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setMyEpisodeInput(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
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
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

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

        {/* 📚 마우스 드래그 이동 가능한 전체 작품 목록 카드 */}
        <section 
          ref={cardBoxRef}
          style={position ? {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '100%',
            maxWidth: '576px',
            zIndex: 50
          } : {}}
          className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-4 shadow-xl space-y-3 transition-colors`}
        >
          {/* 상단 드래그 헤더 */}
          <div 
            onMouseDown={startDraggingBox}
            className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-move select-none p-1.5 -m-1.5 rounded-t-xl hover:bg-slate-50 transition-colors group"
            title="마우스로 상단을 잡고 끌면 원하는 위치로 이동합니다."
          >
            <span className="flex items-center gap-2">
              <Move className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              <Layers className={`w-4 h-4 ${themeStyles.accentText}`} />
              <span>전체 작품 목록 ({filteredAndSortedWorks.length})</span>
            </span>

            {/* 🎯 문법 오류 원인이었던 부등호를 '초과', '미만' 단어로 안전하게 변경 */}
            <div className="flex items-center gap-2">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold"
              >
                <option value="title_asc">이름 (ㄱ-ㅎ)</option>
                <option value="title_desc">이름 (ㅎ-ㄱ)</option>
                <option value="ep_desc">전체회차 높은순</option>
                <option value="ep_asc">전체회차 낮은순</option>
                <option value="err_my_gt_total">🚨 오류 (본 회차 초과)</option>
                <option value="diff_my_lt_total">📖 볼 회차 남음 (본 회차 미만)</option>
              </select>

              {position && (
                <button
                  onClick={() => setPosition(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-all"
                  title="기본 위치로 복원"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 탭 영역 */}
          <div 
            ref={tabsRef}
            onMouseDown={handleTabMouseDown}
            onMouseMove={handleTabMouseMove}
            onMouseUp={handleTabMouseUpOrLeave}
            onMouseLeave={handleTabMouseUpOrLeave}
            onWheel={handleTabWheel}
            className="flex gap-1.5 overflow-x-auto pb-2.5 bg-slate-100 p-1.5 rounded-xl text-xs font-bold cursor-grab active:cursor-grabbing select-none"
          >
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? `${themeStyles.headerBg} text-white shadow-xs`
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 📋 조건별 강조 색상 적용 목록 영역 */}
          <div 
            style={{ height: `${listHeight}px` }} 
            className="space-y-2 overflow-y-auto pr-0.5 transition-[height] duration-75"
          >
            {filteredAndSortedWorks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                해당하는 작품이 없습니다.
              </div>
            ) : (
              filteredAndSortedWorks.map((work) => {
                const myEp = work.my_episode || 0;
                const totalEp = work.episode || 0;
                const isError = myEp > totalEp;

                return (
                  <div 
                    key={work.id}
                    onClick={() => handleSelectSuggestion(work)}
                    className="p-2.5 sm:p-3 bg-slate-50/90 hover:bg-slate-100 border border-slate-200/90 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group gap-1.5 shadow-2xs"
                    title="클릭 시 선택 및 제목이 복사됩니다."
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {work.has_fire_emoji && <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />}
                      <span className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-indigo-600 truncate leading-snug">
                        {work.title}
                      </span>
                      <Copy className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>

                    {/* 📐 3단 고정 컬럼 + 비교 색상 반영 회차 박스 */}
                    <div className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <div className={`border px-1.5 sm:px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold shadow-2xs flex items-center font-mono tabular-nums w-[110px] sm:w-[125px] ${getEpisodeBoxStyle(myEp, totalEp)}`}>
                        <span className={`flex-1 text-right font-extrabold truncate ${isError ? 'text-rose-700' : 'text-amber-600'}`}>
                          📌{myEp}
                        </span>
                        <span className="w-3 text-center text-slate-300 shrink-0">/</span>
                        <span className="flex-1 text-right truncate">
                          {totalEp}화
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => handleQuickIncrementMyEpisode(work, e)}
                        className="px-1.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] sm:text-xs font-black rounded-lg border border-amber-600 transition-all flex items-center gap-0.5 shadow-xs shrink-0 active:scale-95"
                        title="내가 본 회차 +1화 빠른 증가"
                      >
                        <Plus className="w-3 h-3" />1
                      </button>

                      <span className="px-1 py-1 text-[10px] sm:text-[11px] bg-slate-200/80 text-slate-700 rounded-lg font-bold truncate shrink-0 border border-slate-300/60 w-[62px] text-center">
                        {formatStatusLabel(work.status)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 높이 조절 손잡이 */}
          <div
            onMouseDown={startResizing}
            className="w-full pt-1 pb-0.5 cursor-row-resize flex flex-col items-center justify-center hover:bg-slate-100/80 rounded-b-xl border-t border-slate-100 transition-colors group"
            title="위아래로 드래그하면 보이는 목록 높이를 조절할 수 있습니다."
          >
            <GripHorizontal className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </section>

      </main>

      {/* 하단 고정 액션 버튼 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-3.5 sm:px-6 py-3 flex justify-center">
        <div className="w-full max-w-xl flex gap-2">
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
            <span className="text-[11px] opacity-80 font-mono font-normal">(Alt+1)</span>
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
            <span className="text-[11px] opacity-80 font-mono font-normal">(Alt+2)</span>
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

      {/* 📋 클립보드 복사 알림 토스트 팝업 */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl z-50 flex items-center gap-2 backdrop-blur-sm border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
