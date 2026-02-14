
export interface ComicPage {
  id: string;
  blob: Blob;
  order: number;
}

export interface Comic {
  id: string;
  title: string;
  coverImageBlob: Blob | null;
  createdAt: number;
  totalPages: number;
  lastReadPage?: number;
}

export type ViewState = 'LIBRARY' | 'READER' | 'UPLOAD' | 'EDIT' | 'COVER_EDITOR';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
