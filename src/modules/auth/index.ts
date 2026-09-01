// Auth module — owns NextAuth configuration, credential/session verification, magic-key
// verification, and password resets. This is the module's public API; other modules should
// only import from here, not reach into the files below directly.

export { authOptions } from './authOptions'
export { verifyMagicKey, resetPassword, isSuperAdmin, SUPER_ADMIN_EMAIL } from './service'
