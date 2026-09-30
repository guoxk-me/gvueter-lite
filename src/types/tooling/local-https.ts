// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { Buffer } from 'node:buffer'

export interface LocalhostCertificates {
  key: Buffer
  cert: Buffer
}

export interface HttpsLocalhostModule {
  getCerts: (domain?: string) => Promise<LocalhostCertificates>
}
