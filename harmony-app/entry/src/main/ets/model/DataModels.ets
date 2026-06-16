// 应急快报 - 数据类型定义
export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  longitude: number;
  latitude: number;
  status: 'active' | 'closed' | 'archived';
  created_by: string;
  created_at: string;
  materialCount: number;
  reportCount: number;
  latestReport: { version: number; created_at: string } | null;
}

export interface Material {
  id: string;
  event_id: string;
  user_id: string;
  type: 'text' | 'photo' | 'voice' | 'video';
  content: string;
  file_path: string;
  voice_text: string;
  ocr_text: string;
  tags: string;
  user_name: string;
  created_at: string;
}

export interface Report {
  id: string;
  event_id: string;
  version: number;
  status: 'draft' | 'final';
  content: string;
  summary: string;
  diff_notes: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
}

export interface ReportSection {
  key: string;
  title: string;
  items: string[];
  sources: string[];
}

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'reporter' | 'reviewer' | 'commander';
  phone: string;
}
