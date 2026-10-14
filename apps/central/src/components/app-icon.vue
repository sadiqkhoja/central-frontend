
<template>
  <component
    :is="iconComponent"
    :aria-hidden="!ariaLabel"
    :aria-label="ariaLabel"
    role="img"/>
</template>

<script setup>
import { computed } from 'vue';
/* eslint-disable import/no-unresolved, import/extensions */
import IconArchive from '~icons/material-symbols/archive';
import IconMenuBook from '~icons/material-symbols/menu-book';
import IconComment from '~icons/material-symbols/comment';
import IconAccountCircle from '~icons/material-symbols/account-circle';
/* eslint-enable import/no-unresolved, import/extensions */

const icons = {
  IconComment,
  IconMenuBook,
  IconAccountCircle,
  IconArchive
};

defineOptions({
  name: 'AppIcon'
});

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  ariaLabel: String
});

const toIconKey = (name) =>
  `Icon${name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;

const iconComponent = computed(() => {
  const key = toIconKey(props.icon);
  const component = icons[key];
  if (!component) {
    // eslint-disable-next-line no-console
    console.warn(`AppIcon: Unknown icon "${props.icon}"`);
  }
  return component;
});
</script>
