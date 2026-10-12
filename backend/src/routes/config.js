/**
 * Konfigurasi publik untuk pengguna yang sudah login: rekening tujuan transfer
 * dan identitas yayasan. Sumbernya environment server (lihat config.js), jadi
 * tidak ada lagi nomor rekening yang tertanam di kode frontend.
 */
import { Router } from 'express'
import { wajibLogin } from '../middleware/auth.js'
import { INFO_PEMBAYARAN, TOPUP_MIN, TOPUP_MAKS } from '../config.js'

export const configRouter = Router()

configRouter.get('/pembayaran', wajibLogin, (req, res) => {
  res.json({ ...INFO_PEMBAYARAN, topup_min: TOPUP_MIN, topup_maks: TOPUP_MAKS })
})
