import { useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

type AuthMode = 'register' | 'login'

interface AuthPageProps {
  onAuthSuccess: (username: string) => void
}

const normalizeUsername = (input: string): string => {
  return input.trim().replaceAll('/', '_').slice(0, 20)
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary)
}

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password))
  return toBase64(new Uint8Array(digest))
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [usernameInput, setUsernameInput] = useState<string>('')
  const [passwordInput, setPasswordInput] = useState<string>('')
  const [authMessage, setAuthMessage] = useState<string>('')
  const [authLoading, setAuthLoading] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)

  const registerUser = async (): Promise<void> => {
    if (!db) {
      setAuthMessage('Firebase未設定のため登録できません')
      return
    }
    const next = normalizeUsername(usernameInput)
    if (!next || passwordInput.length < 4) {
      setAuthMessage('ユーザーネームと4文字以上のパスワードを入力してください')
      return
    }
    try {
      setAuthLoading(true)
      setAuthMessage('')
      const userDoc = doc(db, 'users', next)
      const existing = await getDoc(userDoc)
      if (existing.exists()) {
        setAuthMessage('このユーザーネームは既に使われています')
        return
      }
      const hash = await hashPassword(passwordInput)
      await setDoc(userDoc, {
        username: next,
        passwordHash: hash,
        createdAt: Date.now(),
      })
      onAuthSuccess(next)
    } catch {
      setAuthMessage('登録に失敗しました')
    } finally {
      setAuthLoading(false)
    }
  }

  const loginUser = async (): Promise<void> => {
    if (!db) {
      setAuthMessage('Firebase未設定のためログインできません')
      return
    }
    const next = normalizeUsername(usernameInput)
    if (!next || passwordInput.length < 4) {
      setAuthMessage('ユーザーネームと4文字以上のパスワードを入力してください')
      return
    }
    try {
      setAuthLoading(true)
      setAuthMessage('')
      const userDoc = doc(db, 'users', next)
      const snapshot = await getDoc(userDoc)
      if (!snapshot.exists()) {
        setAuthMessage('ユーザーが見つかりません')
        return
      }
      const data = snapshot.data() as { passwordHash?: string }
      if (!data.passwordHash) {
        setAuthMessage('ユーザー情報が不正です')
        return
      }
      const hash = await hashPassword(passwordInput)
      if (hash !== data.passwordHash) {
        setAuthMessage('パスワードが違います')
        return
      }
      onAuthSuccess(next)
    } catch {
      setAuthMessage('ログインに失敗しました')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void (authMode === 'register' ? registerUser() : loginUser())
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 pb-20 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="mb-1 text-3xl font-bold text-slate-900 dark:text-white">RiseofGethering</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">集結スケジュール管理</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setAuthMode('register')
                setAuthMessage('')
              }}
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium ${
                authMode === 'register'
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              新規登録
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login')
                setAuthMessage('')
              }}
              className={`flex-1 border-b-2 px-4 py-3 text-sm font-medium ${
                authMode === 'login'
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              ログイン
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                ユーザーネーム
              </label>
              <input
                id="username"
                type="text"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="username"
                maxLength={20}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  placeholder="4文字以上"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showPassword ? '非表示' : '表示'}
                </button>
              </div>
            </div>

            {authMessage && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {authMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {authLoading
                ? '処理中...'
                : authMode === 'register'
                  ? '登録'
                  : 'ログイン'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
