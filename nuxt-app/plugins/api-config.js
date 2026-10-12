/**
 * Mengisi alamat API dari publicRuntimeConfig ke klien API (server & browser).
 */
import { setBaseUrl } from '~/plugins/api'

export default ({ $config }) => {
  setBaseUrl($config.apiBaseUrl)
}
