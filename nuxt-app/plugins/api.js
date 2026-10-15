import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.BACKEND_URL || '/api'
})

// Interceptor respon global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (process.client) {
        localStorage.removeItem('token')
        // Alihkan pengguna ke login saat token tidak valid/kedaluwarsa
        window.location.href = '/login?expired=1'
      }
    }
    return Promise.reject(error)
  }
)

export default ({ $axios }, inject) => {
  inject('api', api)
}
