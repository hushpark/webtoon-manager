export type WorkStatus = 
  | '본거_완결' | '본거_시즌완결' | '본거_연재중' | '본거_휴재'
  | '완결' | '시즌 완결' | '연재중' | '휴재' | '100회 미만' | '휴지통';

export interface Work {
  id: string; // 또는 number
  title: string;
  title_clean?: string;
  episode: number;
  my_episode?: number;
  status: WorkStatus;
  has_fire_emoji?: boolean;
  created_at?: string;  // 👈 추가
  updated_at?: string;  // 👈 추가
}

export type SearchState = 
  | { type: 'IDLE' }
  | { type: 'EXACT_MATCH'; work: Work }
  | { type: 'PARTIAL_MATCH'; candidates: Work[] }
  | { type: 'NEW_WORK'; query: string };

export type ThemeType = 'COBALT' | 'VIOLET' | 'NATURE' | 'CHARCOAL';
