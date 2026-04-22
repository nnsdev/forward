import { createRouter, createWebHistory } from 'vue-router';

import { pinia } from './stores';
import { useSessionStore } from './stores/session';
import HomeView from './views/HomeView.vue';
import LoginView from './views/LoginView.vue';
import PromptView from './views/PromptView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      meta: { guestOnly: true },
      path: '/login',
      component: LoginView,
    },
    {
      meta: { requiresAuth: true },
      path: '/',
      component: HomeView,
    },
    {
      meta: { requiresAuth: true },
      path: '/prompt',
      component: PromptView,
    },
  ],
});

router.beforeEach(async (to) => {
  const sessionStore = useSessionStore(pinia);

  await sessionStore.bootstrap();

  if (to.meta.requiresAuth && !sessionStore.authenticated) {
    return '/login';
  }

  if (to.meta.guestOnly && sessionStore.authenticated) {
    return '/';
  }

  return true;
});
