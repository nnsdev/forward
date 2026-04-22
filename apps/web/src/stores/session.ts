import { defineStore } from 'pinia';

import { api } from '../lib/api';

let bootstrapPromise: Promise<void> | null = null;

export const useSessionStore = defineStore('session', {
  state: () => ({
    authenticated: false,
    error: '',
    hydrated: false,
    pending: false,
  }),
  actions: {
    async bootstrap() {
      if (this.hydrated) {
        return;
      }

      if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
          this.pending = true;

          try {
            const session = await api.getSession();

            this.authenticated = session.authenticated;
          } catch {
            this.authenticated = false;
          } finally {
            this.hydrated = true;
            this.pending = false;
          }
        })();
      }

      await bootstrapPromise;
    },
    async login(password: string) {
      this.pending = true;
      this.error = '';

      try {
        await api.login(password);
        this.authenticated = true;
        this.hydrated = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Login failed';
        this.authenticated = false;
        throw error;
      } finally {
        this.pending = false;
      }
    },
    async logout() {
      this.pending = true;

      try {
        await api.logout();
        this.authenticated = false;
      } finally {
        this.pending = false;
      }
    },
  },
});
