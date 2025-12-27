// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			token?: string;
			user?: {
				id: number;
				username: string;
				email: string;
				full_name?: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'svelte/elements' {
	export interface HTMLAttributes<T> {
		onclickoutside?: (event: CustomEvent<HTMLElement>) => void;
	}
}

export {};
