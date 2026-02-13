
export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  createdAt: string;
}

export type MediaKind = 'photo' | 'video' | 'audio' | 'document';

export interface MediaItem {
  id: string;
  name: string;
  kind: MediaKind;
  url: string;
  mime?: string;
  size?: number;
  createdAt: string;
}

export interface LifeEvent {
  id: string;
  type: string;
  date: string;
  place: string;
  spouseName?: string;
  media: MediaItem[];
}

export interface Memory {
  id: string;
  type: 'story' | 'note';
  content: string;
  timestamp: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  gender?: 'M' | 'F' | 'U';
  birthYear: string;
  deathYear?: string;
  imageUrl: string;
  summary: string;
  historicalContext?: {
    text: string;
    sources: any[];
  };
  timeline: LifeEvent[];
  memories: Memory[];
  sources: string[];
  isMemorial?: boolean;
  // Relationships
  parentIds: string[];
  childIds: string[];
  spouseIds: string[];
}

export interface FamilyTree {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  homePersonId: string;
  memberIds: string[];
}

export type CirclePostWhen =
  | { kind: 'exact';     exactDate: string }
  | { kind: 'year';      year: string }
  | { kind: 'yearMonth'; year: string; month: string }
  | { kind: 'range';     startDate: string; endDate: string }
  | { kind: 'unknown' };

export interface FaceTag {
  id: string;
  profileId: string | null;  // null until resolved
  label: string;             // typed name before resolution
  x: number;                 // 0-1 relative position
  y: number;
  w: number;
  h: number;
}

export interface CircleAttachment {
  id: string;
  name: string;
  kind: 'image' | 'video' | 'audio' | 'document' | 'file';
  mimeType: string;
  sizeBytes: number;
  dataUrl: string | null;
  faceTags: FaceTag[];       // face/person tags on this media
}

export interface CircleComment {
  id: string;
  authorId: string; // userId of commenter
  authorName: string;
  createdAt: string;
  body: string;
}

export interface CirclePost {
  id: string;
  circleId: string;
  authorId: string;   // userId
  authorName: string;
  createdAt: string;
  title: string;
  body: string;
  peopleIds: string[]; // Profile ids tagged in the post body
  when: CirclePostWhen;
  attachments: CircleAttachment[];
  comments: CircleComment[];
  postKind: 'memory' | 'event'; // 'event' = auto-generated from GEDCOM
}

export interface Circle {
  id: string;
  userId: string;
  treeId: string;    // the FamilyTree this circle belongs to
  name: string;
  description: string;
  createdAt: string;
  posts: CirclePost[];
}

export enum AppView {
  SPLASH = 'splash',
  LOGIN = 'login',
  HOME = 'home',
  TREES = 'trees',
  TREE_VIEW = 'tree_view',
  SELECT_HOME = 'select_home',
  PROFILE = 'profile',
  EDIT_PROFILE = 'edit_profile',
  LINK_RELATIVE = 'link_relative',
  CREATE_MEMORY = 'create_memory',
  FAMILY_CIRCLE = 'family_circle'
}
