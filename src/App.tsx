export type WorkStatus = 
  | '연재중' 
  | '완결' 
  | '시즌 완결' 
  | '휴재' 
  | '100회 미만' 
  | '휴지통'
  | '본거_연재중'
  | '본거_완결'
  | '본거_시즌완결'
  | '본거_휴재';

export type ThemeType = 'COBALT' | 'VIOLET' | 'NATURE' | 'CHARCOAL';

export interface Work {
  id: string | number;
  title: string;
  title_clean?: string;
  episode: number;
  my_episode?: number;
  status: WorkStatus;
  has_fire_emoji?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SearchState = 
  | { type: 'IDLE' }
  | { type: 'EXACT_MATCH'; work: Work }
  | { type: 'NEW_WORK'; query: string };
