<template>
  <main class="flex min-h-dvh items-center justify-center bg-[var(--rp-bg)] px-4 text-white/80">
    <form class="w-full max-w-sm space-y-5" @submit.prevent="submit">
      <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--rp-accent)]">Forward</p>
      <h1 class="text-2xl font-semibold tracking-tight text-white/90">Sign in</h1>
      <div>
        <input
          id="password"
          v-model="password"
          autocomplete="current-password"
          class="w-full rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/40"
          name="password"
          placeholder="Password"
          type="password"
        />
      </div>

      <p v-if="sessionStore.error" class="text-sm text-rose-300/80">{{ sessionStore.error }}</p>

      <button
        class="w-full rounded-lg bg-[var(--rp-accent)] px-4 py-3 text-sm font-medium text-[#0d0a07] transition hover:brightness-110 disabled:opacity-40"
        :disabled="sessionStore.pending"
        type="submit"
      >
        {{ sessionStore.pending ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { useSessionStore } from '../stores/session';

const password = ref('');
const router = useRouter();
const sessionStore = useSessionStore();

async function submit() {
  try {
    await sessionStore.login(password.value);
    await router.push('/');
  } catch {
    password.value = '';
  }
}
</script>
