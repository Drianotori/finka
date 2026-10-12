<template>
  <div class="switch" :class="value ? 'switch--on' : ''" :style="value && danger ? 'background: var(--coral)' : ''" @click="$emit('input', !value)">
    <div class="knob"></div>
  </div>
</template>

<script>
export default {
  name: 'ToggleSwitch',
  props: {
    value: { type: Boolean, default: false },
    danger: { type: Boolean, default: false }
  }
}
</script>

<style scoped>
.switch {
  width: 46px; height: 27px; border-radius: var(--r-pill);
  background: var(--disabled); padding: 3px;
  display: flex; justify-content: flex-start; cursor: pointer; flex: none;
  transition: background .15s ease;
}
.switch--on { background: var(--blue); justify-content: flex-end; }
.knob { width: 21px; height: 21px; border-radius: var(--r-pill); background: #fff; }
</style>

