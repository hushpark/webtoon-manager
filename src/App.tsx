import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './lib/supabase';
import type { WorkStatus, SearchState, ThemeType, Work } from './types';
import { THEME_STYLES } from './theme';
import { 
  Search, 
  PlusCircle, 
  ArrowRightLeft, 
  RotateCcw, 
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
  Bookmark,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

const NEW_WORK_STATUS_OPTIONS: WorkStatus[] = [
  '연재중', '완결', '시즌 완결', '휴재', '100회 미만', '휴지통'
];

const UPDATE_STATUS_BUTTONS = [
  '본거', '연재중', '완결', '시즌 완결', '휴재', '100회 미만', '휴지통'
] as const;

type UpdateButtonType = typeof UPDATE_STATUS_BUTTONS[number];

const STATUS_TABS = [
  { id: 'NEW', label: '신규 (7일)' },
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

type SortOption = 
  | 'read_desc' 
  | 'read_asc' 
  | 'unread_desc'
  | 'unread_asc'
  | 'saved_desc' 
  | 'saved_asc' 
  | 'title_asc' 
  | 'title_desc' 
  | 'ep_desc' 
  | 'ep_asc';

type FilterChipKey = 'unread' | 'hasMemo' | 'overRead';

export default function App() {
  const [searchInput, setSearchInput] = useState('');
  const [searchState, setSearchState] = useState<SearchState>({ type: 'IDLE' });
  const [selectedStatus, setSelectedStatus] = useState<WorkStatus | ''>('');
  const [episodeInput, setEpisodeInput] = useState<string>('');
  const [myEpisodeInput, setMyEpisodeInput] = useState<string>('');
  const [memoInput, setMemoInput] = useState<string>('');
  const [isMemoExpanded, setIsMemoExpanded] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading] = useState(false);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 하단 전체 목록에서 [📝] 아이콘을 직접 터치했을 때 열리는 즉시 수정 팝업
  const [quickMemoModal, setQuickMemoModal] = useState<{
    isOpen: boolean;
    targetWork?: Work;
    text: string;
  }>({
    isOpen: false,
    text: ''
  });

  const [suggestions, setSuggestions] = useState<Work[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeType>('COBALT');
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('NEW');
  const [sortOption, setSortOption] = useState<SortOption>('read_desc');

  // 다중 선택 가능한 필터 칩 상태
  const [activeFilters, setActiveFilters] = useState<Record<FilterChipKey, boolean>>({
    unread: false,
    hasMemo: false,
    overRead: false,
  });

  const [listHeight, setListHeight] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 520;
    }
    return 340;
  });

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(340);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingBoxRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const cardBoxRef = useRef<HTMLDivElement>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const isDraggingTabRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const lastWheelTimeRef = useRef<number>(0);

  const cleanTitle = (str: string) => str.replace(/\s+/g, '').toLowerCase();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 1500);
  };

  const toggleFilterChip = (key: FilterChipKey) => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetFilterChips = () => {
    setActiveFilters({ unread: false, hasMemo: false, overRead: false });
  };

  const hasAnyActiveFilter = activeFilters.unread || activeFilters.hasMemo || activeFilters.overRead;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quickMemoModal.isOpen) {
        if (e.key === 'Escape') {
          setQuickMemoModal((prev) => ({ ...prev, isOpen: false }));
        }
        return;
      }

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
  }, [searchState, selectedStatus, episodeInput, myEpisodeInput, memoInput, searchInput, quickMemoModal.isOpen]);

  useEffect(() => {
    const handleMove = (clientY: number, clientX: number) => {
      if (isResizingRef.current) {
        const deltaY = clientY - startYRef.current;
        const newHeight = Math.max(160, Math.min(850, startHeightRef.current + deltaY));
        setListHeight(newHeight);
      } else if (isDraggingBoxRef.current) {
        setPosition({
          x: clientX - dragOffsetRef.current.x,
          y: clientY - dragOffsetRef.current.y
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY, e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && (isResizingRef.current || isDraggingBoxRef.current)) {
        handleMove(e.touches[0].clientY, e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      isResizingRef.current = false;
      isDraggingBoxRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  const startDraggingBox = (clientX: number, clientY: number, target: HTMLElement) => {
    if (target.tagName === 'SELECT' || target.tagName === 'INPUT') return;
    if (window.innerWidth < 640) return;

    isDraggingBoxRef.current = true;
    
    if (cardBoxRef.current) {
      const rect = cardBoxRef.current.getBoundingClientRect();
      dragOffsetRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
      if (!position) {
        setPosition({ x: rect.left, y: rect.top });
      }
    }
    document.body.style.cursor = 'move';
    document.body.style.userSelect = 'none';
  };

  const startResizing = (clientY: number) => {
    isResizingRef.current = true;
    startYRef.current = clientY;
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
    setEpisodeInput('');
    setMyEpisodeInput('');
    setMemoInput('');
    setIsMemoExpanded(false);
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
      setEpisodeInput('');
      setMyEpisodeInput('');
      setMemoInput('');
      setIsMemoExpanded(false);
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
        setEpisodeInput(String(exact.episode || ''));
        setMyEpisodeInput(String(exact.my_episode !== undefined ? exact.my_episode : ''));
        setMemoInput((exact as any).memo || '');
        setSelectedStatus(exact.status as WorkStatus);
      } else {
        setSearchState({ type: 'NEW_WORK', query: trimmed });
        setSelectedStatus('');
        setEpisodeInput('');
        setMyEpisodeInput('');
        setMemoInput('');
      }
    }
  };

  const handleSelectSuggestion = (work: Work) => {
    setSearchInput(work.title);
    setShowSuggestions(false);
    setSearchState({ type: 'EXACT_MATCH', work });
    setEpisodeInput(String(work.episode || ''));
    setMyEpisodeInput(String(work.my_episode !== undefined ? work.my_episode : ''));
    setMemoInput((work as any).memo || '');
    setSelectedStatus(work.status as WorkStatus);
    setLogs((prev) => Array.from(new Set([work.title, ...prev])).slice(0, 10));
    resetTimer();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(work.title).then(() => {
        showToast(`📋 '${work.title}' 선택 완료`);
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
      setEpisodeInput(String(exact.episode || ''));
      setMyEpisodeInput(String(exact.my_episode !== undefined ? exact.my_episode : ''));
      setMemoInput((exact as any).memo || '');
      setSelectedStatus(exact.status as WorkStatus);
    } else {
      setSearchState({ type: 'NEW_WORK', query: trimmed });
      setMemoInput('');
    }
  };

  const handleSelectUpdateStatus = (btn: UpdateButtonType) => {
    if (searchState.type !== 'EXACT_MATCH') {
      setErrorMessage('⚠️ 작품을 선택한 상태에서만 분류 지정을 변경할 수 있습니다.');
      return;
    }

    const currentStatus = searchState.work.status;

    if (btn === '본거') {
      if (selectedStatus.startsWith('본거_')) {
        let normalStatus = selectedStatus.replace('본거_', '') as WorkStatus;
        if ((normalStatus as string) === '시즌완결') normalStatus = '시즌 완결' as WorkStatus;
        setSelectedStatus(normalStatus);
      } else {
        if (episodeInput !== '') setMyEpisodeInput(episodeInput);

        if (currentStatus === '연재중') setSelectedStatus('본거_연재중' as WorkStatus);
        else if (currentStatus === '완결') setSelectedStatus('본거_완결' as WorkStatus);
        else if (currentStatus === '시즌 완결') setSelectedStatus('본거_시즌완결' as WorkStatus);
        else if (currentStatus === '휴재') setSelectedStatus('본거_휴재' as WorkStatus);
        else setSelectedStatus('본거_완결' as WorkStatus);
      }
    } else {
      if (selectedStatus.startsWith('본거_')) {
        if (btn === '연재중') setSelectedStatus('본거_연재중' as WorkStatus);
        else if (btn === '완결') setSelectedStatus('본거_완결' as WorkStatus);
        else if (btn === '시즌 완결') setSelectedStatus('본거_시즌완결' as WorkStatus);
        else if (btn === '휴재') setSelectedStatus('본거_휴재' as WorkStatus);
        else setSelectedStatus(btn as WorkStatus);
      } else {
        setSelectedStatus(btn as WorkStatus);
      }
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
    const nowIso = new Date().toISOString();

    const { error } = await supabase.from('works').insert({
      title,
      title_clean: cleanTitle(title),
      episode: totalEp,
      my_episode: myEp,
      status: selectedStatus,
      memo: memoInput.trim() || null,
      has_fire_emoji: hasFire,
      created_at: nowIso,
      updated_at: nowIso,
      last_read_at: nowIso
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
    const nowIso = new Date().toISOString();

    const hasReadChanged = myEp !== (currentWork.my_episode || 0);
    const nextLastReadAt = hasReadChanged 
      ? nowIso 
      : ((currentWork as any).last_read_at || currentWork.updated_at || nowIso);

    const { error } = await supabase
      .from('works')
      .update({
        title: newTitle,
        title_clean: cleanTitle(newTitle),
        status: selectedStatus,
        episode: totalEp,
        my_episode: myEp,
        memo: memoInput.trim() || null,
        updated_at: nowIso,
        last_read_at: nextLastReadAt
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

  const handleSaveQuickMemo = async () => {
    if (!quickMemoModal.targetWork) return;
    const target = quickMemoModal.targetWork;
    const trimmedMemo = quickMemoModal.text.trim();

    const { error } = await supabase
      .from('works')
      .update({ memo: trimmedMemo || null })
      .eq('id', target.id);

    if (!error) {
      fetchAllWorks();
      if (searchState.type === 'EXACT_MATCH' && searchState.work.id === target.id) {
        setMemoInput(trimmedMemo);
      }
      setQuickMemoModal((prev) => ({ ...prev, isOpen: false }));
      showToast(`📝 '${target.title}' 비고 저장 완료`);
    } else {
      setErrorMessage('비고 저장에 실패했습니다.');
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
    const nowIso = new Date().toISOString();
    
    const { error } = await supabase
      .from('works')
      .update({ 
        my_episode: nextMyEp, 
        has_fire_emoji: false,
        updated_at: nowIso,
        last_read_at: nowIso
      })
      .eq('id', work.id);

    if (!error) {
      fetchAllWorks();
      if (searchState.type === 'EXACT_MATCH' && searchState.work.id === work.id) {
        setMyEpisodeInput(String(nextMyEp));
      }
    }
  };

  const handleInputWheel = (
    e: React.WheelEvent, 
    type: 'TOTAL' | 'MY'
  ) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 120) return;
    lastWheelTimeRef.current = now;

    const delta = e.deltaY < 0 ? 1 : -1;

    if (type === 'TOTAL') {
      setEpisodeInput((prev) => String(Math.max(0, (Number(prev) || 0) + delta)));
    } else {
      setMyEpisodeInput((prev) => String(Math.max(0, (Number(prev) || 0) + delta)));
    }
  };

  const handleListWheel = async (
    e: React.WheelEvent, 
    work: Work, 
    type: 'TOTAL' | 'MY'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    if (now - lastWheelTimeRef.current < 200) return;
    lastWheelTimeRef.current = now;

    const delta = e.deltaY < 0 ? 1 : -1;
    const nowIso = new Date().toISOString();

    if (type === 'MY') {
      const nextMyEp = Math.max(0, (work.my_episode || 0) + delta);
      const { error } = await supabase
        .from('works')
        .update({ 
          my_episode: nextMyEp, 
          has_fire_emoji: false,
          updated_at: nowIso,
          last_read_at: nowIso
        })
        .eq('id', work.id);

      if (!error) {
        fetchAllWorks();
        showToast(`📌 '${work.title}' 본 회차: ${nextMyEp}화`);
      }
    } else {
      const nextTotalEp = Math.max(0, (work.episode || 0) + delta);
      const { error } = await supabase
        .from('works')
        .update({ 
          episode: nextTotalEp, 
          updated_at: nowIso 
        })
        .eq('id', work.id);

      if (!error) {
        fetchAllWorks();
        showToast(`📖 '${work.title}' 전체 회차: ${nextTotalEp}화`);
      }
    }
  };

  const handleTabStart = (pageX: number) => {
    if (!tabsRef.current) return;
    isDraggingTabRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = pageX - tabsRef.current.offsetLeft;
    scrollLeftRef.current = tabsRef.current.scrollLeft;
  };

  const handleTabMove = (pageX: number) => {
    if (!isDraggingTabRef.current || !tabsRef.current) return;
    const x = pageX - tabsRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    tabsRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleTabEnd = () => {
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

  const getFireRemainingDays = (work: Work) => {
    if (!work.has_fire_emoji) return null;
    const dateStr = work.created_at || work.updated_at;
    if (!dateStr) return null;

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const workTime = new Date(dateStr).getTime();
    const diffMs = (workTime + SEVEN_DAYS_MS) - now;

    if (diffMs <= 0) return null;

    const remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return remainingDays;
  };

  // 1단계: 탭 + 다중 필터 칩 조합 필터링
  // 2단계: 1차 정렬 + 2차 보조 자동 다중 정렬
  const filteredAndSortedWorks = useMemo(() => {
    const filtered = allWorks.filter((work) => {
      const myEp = work.my_episode || 0;
      const totalEp = work.episode || 0;
      const hasMemo = Boolean((work as any).memo && (work as any).memo.trim().length > 0);

      // 다중 필터 칩 (AND 조건으로 모두 만족하는 작품 필터링)
      if (activeFilters.unread) {
        if (myEp >= totalEp) return false;
      }
      if (activeFilters.hasMemo) {
        if (!hasMemo) return false;
      }
      if (activeFilters.overRead) {
        if (myEp <= totalEp) return false;
      }

      // 상단 상태 탭 필터
      if (activeTab === 'NEW') {
        const remaining = getFireRemainingDays(work);
        if (remaining === null) return false;
      } else if (activeTab !== 'ALL') {
        const targetStatus = activeTab.replace(/\s+/g, '');
        const currentWorkStatus = (work.status || '').replace(/\s+/g, '');
        if (currentWorkStatus !== targetStatus) return false;
      }

      return true;
    });

    const getReadTime = (w: Work) => new Date((w as any).last_read_at || w.updated_at || w.created_at || 0).getTime();
    const getSavedTime = (w: Work) => new Date(w.updated_at || w.created_at || 0).getTime();
    const getUnreadCount = (w: Work) => (w.episode || 0) - (w.my_episode || 0);

    return filtered.sort((a, b) => {
      let primaryDiff = 0;

      if (sortOption === 'read_desc') {
        primaryDiff = getReadTime(b) - getReadTime(a);
        return primaryDiff !== 0 ? primaryDiff : a.title.localeCompare(b.title, 'ko');
      } 
      if (sortOption === 'read_asc') {
        primaryDiff = getReadTime(a) - getReadTime(b);
        return primaryDiff !== 0 ? primaryDiff : a.title.localeCompare(b.title, 'ko');
      } 
      if (sortOption === 'unread_desc') {
        // 1차: 안 본 회차 많은순 -> 2차: 최근 본 날짜순 -> 3차: 가나다순
        primaryDiff = getUnreadCount(b) - getUnreadCount(a);
        if (primaryDiff !== 0) return primaryDiff;
        const secondaryDiff = getReadTime(b) - getReadTime(a);
        return secondaryDiff !== 0 ? secondaryDiff : a.title.localeCompare(b.title, 'ko');
      }
      if (sortOption === 'unread_asc') {
        // 1차: 안 본 회차 적은순 -> 2차: 최근 본 날짜순 -> 3차: 가나다순
        primaryDiff = getUnreadCount(a) - getUnreadCount(b);
        if (primaryDiff !== 0) return primaryDiff;
        const secondaryDiff = getReadTime(b) - getReadTime(a);
        return secondaryDiff !== 0 ? secondaryDiff : a.title.localeCompare(b.title, 'ko');
      }
      if (sortOption === 'saved_desc') {
        primaryDiff = getSavedTime(b) - getSavedTime(a);
        return primaryDiff !== 0 ? primaryDiff : a.title.localeCompare(b.title, 'ko');
      } 
      if (sortOption === 'saved_asc') {
        primaryDiff = getSavedTime(a) - getSavedTime(b);
        return primaryDiff !== 0 ? primaryDiff : a.title.localeCompare(b.title, 'ko');
      } 
      if (sortOption === 'title_asc') {
        return a.title.localeCompare(b.title, 'ko');
      } 
      if (sortOption === 'title_desc') {
        return b.title.localeCompare(a.title, 'ko');
      } 
      if (sortOption === 'ep_desc') {
        primaryDiff = (b.episode || 0) - (a.episode || 0);
        return primaryDiff !== 0 ? primaryDiff : a.title.localeCompare(b.title, 'ko');
      } 
      if (sortOption === 'ep_asc') {
        primaryDiff = (a.episode || 0) - (b.episode || 0);
        return primaryDiff !== 0 ? primaryDiff : a.title.localeCompare(b.title, 'ko');
      }

      return 0;
    });
  }, [allWorks, activeTab, sortOption, activeFilters]);

  const formatStatusLabel = (status?: string) => {
    if (!status) return '기타';
    return status.replace('_', '-');
  };

  const formatWorkDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isThisYear = d.getFullYear() === now.getFullYear();

    return {
      text: `${month}.${day}`,
      isThisYear
    };
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
    <div className={`min-h-screen overflow-y-scroll ${themeStyles.bg} text-slate-800 pb-36 transition-colors duration-300 flex flex-col items-center`}>
      
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
      <main className="w-full max-w-xl mx-auto p-3.5 sm:p-6 space-y-4 flex-1 flex flex-col items-stretch relative">
        
        {/* 1. 작품 검색 입력 */}
        <section className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-4 shadow-sm space-y-3 transition-colors relative z-40`}>
          <div className="flex justify-between items-center">
            <label className={`text-xs font-bold uppercase tracking-wider ${themeStyles.accentText}`}>
              작품 제목 입력
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

            {/* 자동완성 목록 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] sm:max-h-[320px] overflow-y-auto">
                <div className="sticky top-0 z-10 p-2.5 text-xs font-extrabold text-slate-500 bg-slate-100 border-b border-slate-200 flex justify-between items-center shadow-xs">
                  <span>연관 작품 ({suggestions.length}개)</span>
                  <span className="text-[10px] text-slate-400 font-normal">가나다순 정렬됨</span>
                </div>
                {suggestions.map((work) => {
                  const myEp = work.my_episode || 0;
                  const totalEp = work.episode || 0;
                  const hasMemo = Boolean((work as any).memo && (work as any).memo.trim().length > 0);
                  return (
                    <div
                      key={work.id}
                      onClick={() => handleSelectSuggestion(work)}
                      className="p-3 hover:bg-indigo-50/90 cursor-pointer border-b border-slate-100 last:border-none flex items-center justify-between transition-colors gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-tight">{work.title}</span>
                        {hasMemo && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold shrink-0" title="비고 있음">
                            📝
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div className={`border px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums flex items-center justify-between w-[125px] sm:w-[135px] shrink-0 whitespace-nowrap ${getEpisodeBoxStyle(myEp, totalEp)}`}>
                          <span className={`flex-1 text-right font-black truncate ${myEp > totalEp ? 'text-rose-700' : 'text-amber-900'}`}>
                            <span className="hidden sm:inline mr-0.5">📌</span>{myEp}화
                          </span>
                          <span className="px-1 text-slate-300 font-normal shrink-0">/</span>
                          <span className="flex-1 text-left text-slate-800 truncate">{totalEp}화</span>
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

          {/* 상태 안내 영역 + [📝 비고] 인라인 토글 버튼 및 펼쳐지는 메모 입력창 */}
          <div className="min-h-[64px] flex flex-col justify-center space-y-2">
            {loading && (
              <p className={`text-xs font-bold ${themeStyles.accentText} animate-pulse flex items-center gap-1.5 py-1`}>
                <Sparkles className="w-4 h-4" /> DB 스캔 중입니다...
              </p>
            )}

            {/* 1) 기본 대기 상태 (IDLE): 단축키 안내 + [📝 비고] 버튼 */}
            {!loading && searchState.type === 'IDLE' && (
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 px-3 py-2 bg-slate-50/70 rounded-xl border border-slate-100 font-medium">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap flex-1">
                  <span className="inline-flex items-center gap-1">
                    신규: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Alt+1</kbd>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="inline-flex items-center gap-1">
                    수정: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Alt+2</kbd>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="inline-flex items-center gap-1">
                    초기화: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Esc</kbd>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMemoExpanded((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-extrabold border transition-all shrink-0 active:scale-95 ${
                    isMemoExpanded || memoInput.trim()
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="비고(메모) 입력창 열기/닫기"
                >
                  <FileText className="w-3 h-3" />
                  <span>비고</span>
                  {isMemoExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            )}

            {/* 2) 기존 작품 선택 상태 (EXACT_MATCH) */}
            {!loading && searchState.type === 'EXACT_MATCH' && (
              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-xs sm:text-sm text-blue-900 space-y-1">
                <div className="font-extrabold text-blue-700 text-sm flex items-center justify-between gap-2">
                  <span className="truncate leading-tight">🔎 '{searchState.work.title}'</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsMemoExpanded((prev) => !prev)}
                      className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold border transition-all active:scale-95 ${
                        isMemoExpanded || memoInput.trim()
                          ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs'
                          : 'bg-white text-slate-700 border-blue-300 hover:bg-blue-100'
                      }`}
                      title="비고(메모) 열기/닫기"
                    >
                      <FileText className="w-3 h-3" />
                      <span>비고</span>
                      {memoInput.trim() && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {isMemoExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[11px] shadow-xs">
                      현재: {formatStatusLabel(searchState.work.status)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-blue-800 font-medium">
                  <span>
                    📌 본 날짜: <strong>{new Date((searchState.work as any).last_read_at || searchState.work.updated_at || searchState.work.created_at || '').toLocaleDateString()}</strong>
                  </span>
                  <span className="text-blue-300">|</span>
                  <span>
                    💾 저장: <strong>{new Date(searchState.work.updated_at || searchState.work.created_at || '').toLocaleDateString()}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* 3) 신규 작품 입력 상태 (NEW_WORK) */}
            {!loading && searchState.type === 'NEW_WORK' && (
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs sm:text-sm text-emerald-900">
                <div className="font-extrabold text-emerald-800 text-sm flex items-center justify-between gap-2">
                  <span>⭕ 미등록 신규 작품입니다.</span>
                  <button
                    type="button"
                    onClick={() => setIsMemoExpanded((prev) => !prev)}
                    className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-extrabold border transition-all active:scale-95 ${
                      isMemoExpanded || memoInput.trim()
                        ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs'
                        : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>비고</span>
                    {memoInput.trim() && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    )}
                    {isMemoExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
                  <span>회차 및 분류 선택 후</span>
                  <kbd className="px-1.5 py-0.2 bg-emerald-100 border border-emerald-300 rounded text-[10px] font-mono font-bold text-emerald-800">Alt+1</kbd>
                  <span>을 누르세요.</span>
                </p>
              </div>
            )}

            {/* [비고] 버튼 클릭 시 바로 아래 펼쳐지는 인라인 메모 입력창 */}
            {isMemoExpanded && (
              <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-2.5 space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>작품 비고 (메모)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {memoInput.trim() && (
                      <button
                        type="button"
                        onClick={() => setMemoInput('')}
                        className="text-[10px] text-slate-500 hover:text-rose-600 font-bold"
                      >
                        비우기
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsMemoExpanded(false)}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-extrabold px-1.5 py-0.5 bg-amber-200/70 rounded"
                    >
                      접기
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  disabled={searchState.type === 'IDLE'}
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  placeholder={
                    searchState.type === 'IDLE'
                      ? '먼저 위에서 작품을 검색하거나 새 제목을 입력하세요.'
                      : '메모를 입력하세요... (신규 등록 또는 이동/수정 시 함께 저장됩니다)'
                  }
                  className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none leading-relaxed disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            )}
          </div>
        </section>

        {/* 2 & 3. 상단 회차 및 분류 구역 */}
        <section className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3 transition-colors relative z-20`}>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-slate-700 mb-1 flex items-center justify-between whitespace-nowrap">
                <span>최신 회차 (전체)</span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal hidden sm:inline">🖱️ 휠 조절</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onWheel={(e) => handleInputWheel(e, 'TOTAL')}
                onFocus={() => {
                  if (episodeInput === '0') setEpisodeInput('');
                }}
                onBlur={() => {
                  if (episodeInput.trim() === '') setEpisodeInput('0');
                }}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-extrabold text-base bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 transition-all cursor-text"
                placeholder="최신화"
                value={episodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setEpisodeInput(val);
                }}
                title="터치하여 직접 입력하거나 휠로 조절"
              />
            </div>

            <div>
              <label className="text-[11px] sm:text-xs font-bold text-amber-900 mb-1 flex items-center justify-between whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-600 shrink-0" />
                  <span>내가 본 회차</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-700 font-normal hidden sm:inline">🖱️ 휠 조절</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onWheel={(e) => handleInputWheel(e, 'MY')}
                onFocus={() => {
                  if (myEpisodeInput === '0') setMyEpisodeInput('');
                }}
                onBlur={() => {
                  if (myEpisodeInput.trim() === '') setMyEpisodeInput('0');
                }}
                className="w-full p-2.5 border border-amber-500 bg-amber-50/90 rounded-xl font-black text-base text-amber-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600 placeholder-amber-400 transition-all cursor-text"
                placeholder="보던 위치"
                value={myEpisodeInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setMyEpisodeInput(val);
                }}
                title="터치하여 직접 입력하거나 휠로 조절"
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
                  const isBoughtActive = selectedStatus.startsWith('본거_');
                  const isSelected = btn === '본거' ? isBoughtActive : (selectedStatus === btn || selectedStatus === `본거_${btn}`.replace('본거_시즌 완결', '본거_시즌완결'));
                  
                  return (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleSelectUpdateStatus(btn)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                        btn === '본거'
                          ? isBoughtActive
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-[1.02]'
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                          : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-[1.02]'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{btn === '본거' ? '⭐ 본거' : btn}</span>
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

          {/* 우측 날개 플로팅 버튼 */}
          {(searchState.type === 'NEW_WORK' || searchState.type === 'EXACT_MATCH') && (
            <aside 
              aria-label="빠른 실행 메뉴"
              className="absolute right-2 sm:-right-24 top-16 sm:top-20 z-40 flex flex-col gap-2 pointer-events-auto"
            >
              {searchState.type === 'NEW_WORK' && (
                <button
                  type="button"
                  onClick={handleRegister}
                  className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl font-bold text-xs shadow-2xl backdrop-blur-md transition-all active:scale-95 border ${themeStyles.secondaryBtn} text-white border-emerald-400/50 shadow-emerald-500/40`}
                  title="신규 등록 (Alt+1)"
                >
                  <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="inline">신규 등록</span>
                </button>
              )}

              {searchState.type === 'EXACT_MATCH' && (
                <button
                  type="button"
                  onClick={handleMoveOrUpdate}
                  className={`flex items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl font-bold text-xs shadow-2xl backdrop-blur-md transition-all active:scale-95 border ${themeStyles.primaryBtn} text-white border-indigo-400/50 shadow-indigo-500/40`}
                  title="이동 / 수정 (Alt+2)"
                >
                  <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="inline">이동/수정</span>
                </button>
              )}

              {searchState.type === 'EXACT_MATCH' && (
                <button
                  type="button"
                  onClick={handleDeleteWork}
                  className="flex items-center gap-1.5 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-2xl font-bold text-xs shadow-2xl backdrop-blur-md transition-all active:scale-95 border bg-rose-600 hover:bg-rose-700 text-white border-rose-400/50 shadow-rose-500/40"
                  title="데이터베이스에서 완전히 삭제"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="inline">삭제</span>
                </button>
              )}
            </aside>
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

        {/* 목록 상자 */}
        <section 
          ref={cardBoxRef}
          style={position ? {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '100%',
            maxWidth: '576px',
            zIndex: 30
          } : {}}
          className={`bg-white border ${themeStyles.cardBorder} rounded-2xl p-3 sm:p-4 shadow-xl space-y-2.5 transition-colors`}
        >
          {/* 상단 드래그 헤더 및 1차/2차 스마트 정렬 옵션 */}
          <div 
            onMouseDown={(e) => startDraggingBox(e.clientX, e.clientY, e.target as HTMLElement)}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                startDraggingBox(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
              }
            }}
            className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-move select-none p-1 -m-1 rounded-t-xl hover:bg-slate-50 transition-colors group touch-none gap-1"
            title="손가락/마우스로 잡고 끌면 원하는 위치로 이동합니다."
          >
            <span className="flex items-center gap-1 shrink-0 whitespace-nowrap text-[11px] sm:text-xs">
              <Move className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors hidden sm:inline" />
              <Layers className={`w-3.5 h-3.5 ${themeStyles.accentText}`} />
              <span>전체 목록 ({filteredAndSortedWorks.length})</span>
            </span>

            <div className="flex items-center gap-1 shrink-0">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] sm:text-xs rounded-lg px-1.5 sm:px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer font-bold shadow-2xs"
                title="동점일 경우 최근 본 날짜 및 가나다순으로 2차 자동 정렬됩니다"
              >
                <optgroup label="── 내가 본 날짜 ──">
                  <option value="read_desc">📌 최근 본 날짜순 (최신순)</option>
                  <option value="read_asc">⏳ 오래전 본 날짜순 (오래된순)</option>
                </optgroup>
                <optgroup label="── 미열람 회차 (2차: 최근순) ──">
                  <option value="unread_desc">📉 안 본 회차 많은순</option>
                  <option value="unread_asc">📈 안 본 회차 적은순</option>
                </optgroup>
                <optgroup label="── 데이터 저장일 ──">
                  <option value="saved_desc">💾 최근 저장일순 (최신순)</option>
                  <option value="saved_asc">🗄️ 오래된 저장일순 (오래된순)</option>
                </optgroup>
                <optgroup label="── 작품 이름 ──">
                  <option value="title_asc">🔤 이름순 (ㄱ-ㅎ)</option>
                  <option value="title_desc">🔡 이름순 (ㅎ-ㄱ)</option>
                </optgroup>
                <optgroup label="── 전체 회차 ──">
                  <option value="ep_desc">🔼 전체 회차 높은순</option>
                  <option value="ep_asc">🔽 전체 회차 낮은순</option>
                </optgroup>
              </select>

              {position && (
                <button
                  onClick={() => setPosition(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-all shrink-0"
                  title="기본 중앙 위치로 복원"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 상태 탭 영역 */}
          <div 
            ref={tabsRef}
            onMouseDown={(e) => handleTabStart(e.pageX)}
            onMouseMove={(e) => handleTabMove(e.pageX)}
            onMouseUp={handleTabEnd}
            onMouseLeave={handleTabEnd}
            onTouchStart={(e) => e.touches.length > 0 && handleTabStart(e.touches[0].pageX)}
            onTouchMove={(e) => e.touches.length > 0 && handleTabMove(e.touches[0].pageX)}
            onTouchEnd={handleTabEnd}
            onWheel={handleTabWheel}
            className="flex gap-1.5 overflow-x-auto pb-2 bg-slate-100 p-1.5 rounded-xl text-xs font-bold cursor-grab active:cursor-grabbing select-none"
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

          {/* 다중 선택 가능한 조건 필터 칩 바 */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 mr-0.5">
                <Filter className="w-3 h-3" />
                <span>필터</span>
              </span>

              <button
                type="button"
                onClick={() => toggleFilterChip('unread')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                  activeFilters.unread
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>📖 안 본 회차</span>
              </button>

              <button
                type="button"
                onClick={() => toggleFilterChip('hasMemo')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                  activeFilters.hasMemo
                    ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>📝 비고 있음</span>
              </button>

              <button
                type="button"
                onClick={() => toggleFilterChip('overRead')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 flex items-center gap-1 ${
                  activeFilters.overRead
                    ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🚨 회차 초과</span>
              </button>
            </div>

            {hasAnyActiveFilter && (
              <button
                type="button"
                onClick={resetFilterChips}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
              >
                초기화
              </button>
            )}
          </div>

          {/* 하단 카드 목록 */}
          <div 
            style={{ height: `${listHeight}px` }} 
            className="space-y-1.5 overflow-y-auto pr-0.5 transition-[height] duration-75"
          >
            {filteredAndSortedWorks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                조건에 해당하는 작품이 없습니다.
              </div>
            ) : (
              filteredAndSortedWorks.map((work) => {
                const myEp = work.my_episode || 0;
                const totalEp = work.episode || 0;
                const isError = myEp > totalEp;
                const remainingFireDays = getFireRemainingDays(work);
                const dateInfo = formatWorkDate((work as any).last_read_at || work.updated_at || work.created_at);
                const workMemo = ((work as any).memo || '').trim();
                const hasMemo = workMemo.length > 0;

                return (
                  <div 
                    key={work.id}
                    onClick={() => handleSelectSuggestion(work)}
                    className="p-1.5 sm:p-2 bg-slate-50/90 hover:bg-slate-100 border border-slate-200/90 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group gap-2 shadow-2xs min-h-[48px]"
                    title="클릭 시 상단 편집창으로 로드 및 제목 복사"
                  >
                    {/* 왼쪽: 제목 + 비고 아이콘 버튼 */}
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 my-auto pr-1">
                      {remainingFireDays !== null && (
                        <span 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                            remainingFireDays <= 1 
                              ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-pulse' 
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                          title={`신규 탭 유지 기한: ${remainingFireDays}일 남음`}
                        >
                          <Flame className="w-3 h-3 fill-current shrink-0" />
                          <span>{remainingFireDays === 0 ? 'D-Day' : `D-${remainingFireDays}`}</span>
                        </span>
                      )}

                      <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 leading-tight line-clamp-2">
                        {work.title}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickMemoModal({
                            isOpen: true,
                            targetWork: work,
                            text: workMemo
                          });
                        }}
                        className={`relative p-1 rounded-md border transition-all shrink-0 active:scale-90 ${
                          hasMemo
                            ? 'bg-amber-100/90 text-amber-800 border-amber-300 hover:bg-amber-200'
                            : 'bg-white/80 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-200/70'
                        }`}
                        title={hasMemo ? `비고 보기/수정: ${workMemo}` : '비고 추가'}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {hasMemo && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </button>

                      <Copy className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:inline" />
                    </div>

                    {/* 오른쪽: 회차 및 상태 버튼 (160px 너비) */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0 whitespace-nowrap my-auto">
                      
                      {/* 1층: 회차 박스 */}
                      <div className={`border rounded-md text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center font-mono tabular-nums w-[160px] justify-between overflow-hidden select-none pointer-events-none ${getEpisodeBoxStyle(myEp, totalEp)}`}>
                        <div 
                          onWheel={(e) => handleListWheel(e, work, 'MY')}
                          className="px-1.5 py-0.5 bg-amber-50/50 hover:bg-amber-100/80 transition-colors flex-1 text-left pointer-events-auto"
                          title="마우스 휠로 본 회차 조절 / 클릭 시 상단 편집창 로드"
                        >
                          <span className={`font-black truncate ${isError ? 'text-rose-700' : 'text-amber-900'}`}>
                            📌 {myEp}화
                          </span>
                        </div>

                        <span className="text-slate-300 font-normal shrink-0">/</span>

                        <div 
                          onWheel={(e) => handleListWheel(e, work, 'TOTAL')}
                          className="px-1.5 py-0.5 hover:bg-slate-200/60 transition-colors flex-1 text-right pointer-events-auto"
                          title="마우스 휠로 전체 회차 조절 / 클릭 시 상단 편집창 로드"
                        >
                          <span className="truncate text-slate-800 font-extrabold">
                            {totalEp}화
                          </span>
                        </div>
                      </div>
                      
                      {/* 2층: +1 버튼 + 상태 태그 */}
                      <div className="flex items-center gap-1 w-[160px] justify-end">
                        <button
                          onClick={(e) => handleQuickIncrementMyEpisode(work, e)}
                          className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded border border-amber-600 transition-all flex items-center gap-0.5 shadow-xs shrink-0 active:scale-95"
                          title="내가 본 회차 +1화 빠른 증가"
                        >
                          <Plus className="w-2.5 h-2.5" />1
                        </button>

                        <span className="flex-1 py-0.5 px-1.5 text-[11px] bg-slate-200/90 text-slate-800 rounded font-bold shrink-0 border border-slate-300/60 text-center truncate flex items-center justify-center gap-1">
                          <span>{formatStatusLabel(work.status)}</span>
                          {dateInfo && (
                            <span className={`text-[10px] font-mono ${dateInfo.isThisYear ? 'text-indigo-700 font-black' : 'text-amber-700 font-bold'}`}>
                              ({dateInfo.text})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 높이 조절 손잡이 */}
          <div
            onMouseDown={(e) => startResizing(e.clientY)}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                startResizing(e.touches[0].clientY);
              }
            }}
            className="w-full pt-1.5 pb-1 cursor-row-resize flex flex-col items-center justify-center hover:bg-slate-100/80 rounded-b-xl border-t border-slate-100 transition-colors group touch-none"
            title="위아래로 끌면 목록 높이를 늘리거나 줄일 수 있습니다."
          >
            <GripHorizontal className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </section>

      </main>

      {/* 하단 전체 목록에서 [📝] 아이콘 직접 터치 시 열리는 즉시 수정 팝업 */}
      {quickMemoModal.isOpen && (
        <div 
          onClick={() => setQuickMemoModal((prev) => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>작품 비고 (메모)</span>
                </div>
                <p className="text-xs font-bold text-indigo-600 truncate mt-0.5">
                  {quickMemoModal.targetWork?.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickMemoModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              autoFocus
              rows={5}
              value={quickMemoModal.text}
              onChange={(e) => setQuickMemoModal((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="작품에 대한 비고나 메모를 입력하세요..."
              className="w-full p-3.5 bg-amber-50/50 border border-amber-300 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
            />

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setQuickMemoModal((prev) => ({ ...prev, text: '' }))}
                className="py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all active:scale-95"
              >
                내용 비우기
              </button>
              <button
                type="button"
                onClick={handleSaveQuickMemo}
                className={`py-3 rounded-xl font-extrabold text-xs sm:text-sm text-white shadow-md transition-all active:scale-95 ${themeStyles.primaryBtn}`}
              >
                바로 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 고정 액션 바 */}
      <footer 
        aria-label="화면 하단 고정 메뉴"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 sm:px-4 sm:py-3 shadow-2xl flex items-center justify-center"
      >
        <div className="w-full max-w-xl grid grid-cols-3 gap-2">
          {/* 1. 신규 등록 버튼 */}
          <button
            type="button"
            disabled={searchState.type !== 'NEW_WORK'}
            onClick={handleRegister}
            className={`py-3 rounded-xl font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 border ${
              searchState.type === 'NEW_WORK'
                ? `${themeStyles.secondaryBtn} text-white border-emerald-400/50 shadow-emerald-500/20 active:scale-95 cursor-pointer`
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">신규 등록</span>
          </button>

          {/* 2. 이동 / 수정 버튼 */}
          <button
            type="button"
            disabled={searchState.type !== 'EXACT_MATCH'}
            onClick={handleMoveOrUpdate}
            className={`py-3 rounded-xl font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 border ${
              searchState.type === 'EXACT_MATCH'
                ? `${themeStyles.primaryBtn} text-white border-indigo-400/50 shadow-indigo-500/20 active:scale-95 cursor-pointer`
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">이동/수정</span>
          </button>

          {/* 3. 삭제 버튼 */}
          <button
            type="button"
            disabled={searchState.type !== 'EXACT_MATCH'}
            onClick={handleDeleteWork}
            className={`py-3 rounded-xl font-extrabold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 border ${
              searchState.type === 'EXACT_MATCH'
                ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-400/50 shadow-rose-500/20 active:scale-95 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="truncate">삭제</span>
          </button>
        </div>
      </footer>

      {/* 토스트 팝업 */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-50 flex items-center gap-2 backdrop-blur-sm border border-slate-700 pointer-events-none animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
