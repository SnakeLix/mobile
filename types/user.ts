import { UUID } from "crypto";

// User schemas
export interface UserMetadata {
  [key: string]: any;
}

export interface UserBase {
  email: string;
  user_metadata?: UserMetadata;
}

export interface UserCreate extends UserBase {
  password: string;
}

export interface UserUpdate {
  email?: string;
  password?: string;
  user_metadata?: UserMetadata;
}

export interface UserInDB extends UserBase {
  id: UUID;
  created_at: Date;
  updated_at: Date;
}

export interface User extends UserInDB {}

// Login schema
export interface LoginRequest {
  email: string;
  password: string;
}

// Token schemas
export interface Token {
  access_token: string;
  token_type: string;
}

export interface TokenPayload {
  sub: string;
  exp: Date;
}