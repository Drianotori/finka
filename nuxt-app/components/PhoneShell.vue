<template>
  <div class="phone" :class="dark ? 'phone--dark' : ''">
    <div class="status">
      <span class="num status__jam">{{ jam }}</span>
      <span class="status__icons status__tiruan">
        <i class="sig"></i>
        <i class="bat"><b></b></i>
      </span>
    </div>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'PhoneShell',
  props: {
    dark: { type: Boolean, default: false }
  },
  data() { return { jam: '' } },
  mounted() {
    // Jam sungguhan (WIB) untuk tampilan bingkai di desktop.
    const perbarui = () => {
      this.jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(':', '.')
    }
    perbarui()
    this.timer = setInterval(perbarui, 30000)
  },
  beforeDestroy() { clearInterval(this.timer) }
}
</script>

<style scoped>
.phone {
  width: 390px;
  height: 844px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}
.phone--dark { background: var(--navy); }

.status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px 6px;
  font: 600 13px var(--font-body);
  color: var(--ink);
  background: #fff;
  flex: none;
}
.phone--dark .status { color: #fff; background: transparent; }

.status__icons { display: flex; gap: 5px; align-items: center; }

/* Di HP sungguhan aplikasi memenuhi layar; bingkai & bar status tiruan disembunyikan.
   Bar tetap ada (tinggi tipis) sebagai tempat tombol Keluar. */
@media (max-width: 480px) {
  .phone { width: 100%; height: 100vh; height: 100dvh; border: none; border-radius: 0; }
  .status { min-height: 34px; padding: 0; }
  .status__jam, .status__tiruan { display: none; }
}
.sig { width: 16px; height: 9px; border: 1.5px solid currentColor; border-radius: 2px; display: block; }
.bat { width: 22px; height: 9px; border: 1.5px solid currentColor; border-radius: 3px; display: block; position: relative; }
.bat b { position: absolute; inset: 1.5px; right: 6px; background: currentColor; border-radius: 1px; }
</style>

