export interface NoteCacheEntry {
  slug: string;
  addedAt: number;
  updatedAt: number;
}

export interface NoteCacheModel {
  notes: NoteCacheEntry[];
}
