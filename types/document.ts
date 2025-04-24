import { UUID } from "crypto";

// Document schemas
export interface Page {
  image_url: string;
  text: string;
}

export interface DocumentBase {
  title?: string;
  data: { pages: Page[] };
}

export interface DocumentCreate extends DocumentBase {}

export interface DocumentUpdate {
  title?: string;
  data?: { pages: Page[] };
}

export interface DocumentInDB extends DocumentBase {
  id: UUID;
  user_id: UUID;
  created_at: Date;
  updated_at: Date;
}

export interface Document extends DocumentInDB {}