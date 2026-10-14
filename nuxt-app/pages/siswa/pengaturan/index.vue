<template>
  <div class="wrap">
    <div class="header">
      <button class="back-btn" type="button" @click="$router.back()">
        ←
      </button>

      <div>
        <div class="header__title display">Pengaturan</div>
        <div class="header__sub">Kelola akun dan keamanan</div>
      </div>
    </div>

    <div class="content">
      <div class="section-title display">Akun</div>

      <div class="menu-card">
       <nuxt-link
  to="/siswa/pin"
  class="menu-item"
>
  <div class="menu-icon">🔐</div>

  <div class="menu-info">
    <div class="menu-title">Ubah PIN Pembayaran</div>
    <div class="menu-desc">
      Ganti PIN yang digunakan saat melakukan pembayaran
    </div>
  </div>

  <div class="arrow">›</div>
</nuxt-link>
      </div>

      <div class="section-title display keamanan-title">
        Keamanan
      </div>

      <div class="info-card">
        <div class="info-icon">🛡️</div>
        <div>
          <div class="info-title">Jaga PIN kamu</div>
          <div class="info-desc">
            Jangan berikan PIN pembayaran kepada orang lain.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  layout: 'phone',
  middleware: 'auth'
}
</script>

<style scoped>
.wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: #f7f8fc;
}

.header {
  background: var(--navy);
  color: #fff;
  padding: 18px 22px 24px;
  display: flex;
  align-items: center;
  gap: 13px;
}

.back-btn {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: rgba(255,255,255,.1);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  background: rgba(255,255,255,.18);
}

.header__title {
  font-size: 20px;
  font-weight: 700;
}

.header__sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: rgba(255,255,255,.6);
}

.content {
  padding: 22px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--navy);
}

.menu-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  overflow: hidden;
}

.menu-item {
  width: 100%;
  border: 0;
  background: #fff;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 13px;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover {
  background: #f8faff;
}

.menu-icon {
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 12px;
  background: #eef4ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.menu-info {
  flex: 1;
}

.menu-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--navy);
}

.menu-desc {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.arrow {
  font-size: 24px;
  color: var(--blue);
}

.keamanan-title {
  margin-top: 24px;
}

.info-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 15px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.info-icon {
  font-size: 18px;
}

.info-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--navy);
}

.info-desc {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--muted);
}
</style>