<template>
  <svg :width="size" :height="size" :viewBox="'0 0 ' + n * cell + ' ' + n * cell">
    <rect v-for="r in rects" :key="r.k" :x="r.x" :y="r.y" :width="cell" :height="cell" fill="#0A0D3B" />
  </svg>
</template>

<script>
export default {
  name: 'QrCode',
  props: {
    size: { type: Number, default: 224 },
    cell: { type: Number, default: 10 },
    seed: { type: Number, default: 47 }
  },
  data() {
    return { n: 21 }
  },
  computed: {
    rects() {
      const out = []
      for (let y = 0; y < this.n; y++) {
        for (let x = 0; x < this.n; x++) {
          const corner = (x < 7 && y < 7) || (x > this.n - 8 && y < 7) || (x < 7 && y > this.n - 8)
          let on
          if (corner) {
            const cx = x < 7 ? x : this.n - 1 - x
            const cy = y < 7 ? y : this.n - 1 - y
            on = cx === 0 || cx === 6 || cy === 0 || cy === 6 || (cx > 1 && cx < 5 && cy > 1 && cy < 5)
          } else {
            on = ((x * 7 + y * 13 + this.seed * 3 + x * y) % 5) < 2
          }
          if (on) out.push({ k: x + '-' + y, x: x * this.cell, y: y * this.cell })
        }
      }
      return out
    }
  }
}
</script>

