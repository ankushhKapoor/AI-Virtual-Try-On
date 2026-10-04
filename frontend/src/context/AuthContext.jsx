import { useEffect, useState } from 'react'
import AuthContext from './auth-context'
import { getCurrentUser, loginAdmin as requestAdminLogin, loginUser as requestUserLogin, registerUser as requestRegisterUser } from '../services/authService'

const AUTH_STORAGE_KEY = 'vesta_auth_session'
function readStoredSession() {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null

    const session = JSON.parse(stored)
    if (!session || !session.accessToken || !['user', 'admin'].includes(session.role)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const restoreSession = async () => {
      const storedSession = readStoredSession()
      if (!storedSession) {
        if (active) setIsLoading(false)
        return
      }

      if (storedSession.role === 'admin') {
        if (active) {
          setSession(storedSession)
          setIsLoading(false)
        }
        return
      }

      try {
        const user = await getCurrentUser(storedSession.accessToken)
        if (active) setSession({ ...storedSession, user })
      } catch {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
        if (active) setSession(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    restoreSession()
    return () => { active = false }
  }, [])

  const saveSession = (nextSession) => {
    setSession(nextSession)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
  }

  const loginUser = async (credentials) => {
    const { access_token: accessToken } = await requestUserLogin(credentials)
    const user = await getCurrentUser(accessToken)
    saveSession({ role: 'user', accessToken, user })
  }

  const loginAdmin = async (credentials) => {
    const { access_token: accessToken } = await requestAdminLogin(credentials)
    saveSession({ role: 'admin', accessToken, admin: { email: credentials.email } })
  }

  const registerUser = (credentials) => requestRegisterUser(credentials)

  const logout = () => {
    const loginPath = session?.role === 'admin' ? '/admin/login' : '/login'
    setSession(null)
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return loginPath
  }

  const value = {
    user: session?.user ?? null,
    admin: session?.admin ?? null,
    role: session?.role ?? null,
    accessToken: session?.accessToken ?? null,
    isAuthenticated: Boolean(session),
    isLoading,
    loginUser,
    loginAdmin,
    registerUser,
    logout,
  }

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Vesta AI</p></main>
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }