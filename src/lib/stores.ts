import { writable } from 'svelte/store';
import type { User } from './backend';

export const user = writable<User | undefined>(undefined);
export const isAuthenticated = writable<boolean>(false);
