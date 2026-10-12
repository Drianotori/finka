import { Router } from 'express'
import { adminUsersRouter } from './admin/users.js'
import { adminReportsRouter } from './admin/reports.js'
import { adminAccountsRouter } from './admin/accounts.js'
import { adminImporRouter } from './admin/impor.js'
import { adminKelasRouter } from './admin/kelas.js'
import { adminEksporRouter } from './admin/ekspor.js'

// Semua endpoint /api/admin dikumpulkan di sini.
// Detail fitur dipisah berdasarkan tanggung jawab agar file tetap mudah dibaca.
export const adminRouter = Router()

adminRouter.use('/', adminUsersRouter)
adminRouter.use('/', adminReportsRouter)
adminRouter.use('/', adminAccountsRouter)
adminRouter.use('/', adminImporRouter)
adminRouter.use('/', adminKelasRouter)
adminRouter.use('/', adminEksporRouter)
