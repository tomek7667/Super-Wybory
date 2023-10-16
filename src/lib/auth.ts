import { writable } from "svelte/store";

export interface User {
  avatar: string;
  created: Date;
  email: string;
  id: string;
  name: string;
  updated: Date;
  username: string;
  verified: boolean;
}

export const serializeUser = (user: User) => {
  return JSON.stringify(user);
};

export const deserializeUser = (record: Record<string, unknown>): User => {
  return {
    avatar: record.avatar as string,
    created: new Date(record.created as string),
    email: record.email as string,
    id: record.id as string,
    name: record.name as string,
    updated: new Date(record.updated as string),
    username: record.username as string,
    verified: record.verified as boolean,
  };
};

export const user = writable<User | null>(null);
