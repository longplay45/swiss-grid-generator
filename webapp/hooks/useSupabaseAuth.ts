"use client"

import { useCallback, useEffect, useState } from "react"
import type { Session, SupabaseClient, User } from "@supabase/supabase-js"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { mapSupabaseAuthError } from "@/lib/supabase/error-messages"

export type SupabaseAuthStatus = "loading" | "signed_out" | "signed_in"

export function useSupabaseAuth() {
  const [supabase] = useState<SupabaseClient | null>(() => {
    try {
      return getSupabaseBrowserClient()
    } catch {
      return null
    }
  })
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<SupabaseAuthStatus>(supabase ? "loading" : "signed_out")
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) {
        setAuthError(mapSupabaseAuthError(error, "session"))
        setStatus("signed_out")
        return
      }
      setSession(data.session ?? null)
      setStatus(data.session ? "signed_in" : "signed_out")
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? "signed_in" : "signed_out")
      if (nextSession?.user?.email) {
        setAuthError(null)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [supabase])

  const user = session?.user ?? null

  const sendSignInCode = useCallback(async (email: string) => {
    if (!supabase) {
      const error = new Error("Supabase client is unavailable.")
      setAuthError(mapSupabaseAuthError(error, "send_sign_in_code"))
      throw error
    }
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      const error = new Error("Email is required.")
      setAuthError(mapSupabaseAuthError(error, "send_sign_in_code"))
      throw error
    }

    setAuthError(null)
    setAuthMessage(`Sending sign-in code to ${normalizedEmail}...`)

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(mapSupabaseAuthError(error, "send_sign_in_code"))
      throw error
    }

    setAuthMessage(`Code sent to ${normalizedEmail}. Enter the six-digit code from your email to continue.`)
  }, [supabase])

  const verifySignInCode = useCallback(async (email: string, code: string) => {
    if (!supabase) {
      const error = new Error("Supabase client is unavailable.")
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }
    const normalizedEmail = email.trim()
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6)
    if (!normalizedEmail) {
      const error = new Error("Email is required.")
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }
    if (normalizedCode.length !== 6) {
      const error = new Error("Code is required.")
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }

    setAuthError(null)
    setAuthMessage("Verifying sign-in code...")

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedCode,
      type: "email",
    })

    if (error) {
      setAuthError(mapSupabaseAuthError(error, "verify_sign_in_code"))
      throw error
    }

    setAuthMessage(null)
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    setAuthError(null)
    setAuthMessage(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthError(mapSupabaseAuthError(error, "sign_out"))
      throw error
    }
  }, [supabase])

  return {
    supabase,
    session,
    user: user as User | null,
    status,
    authError,
    authMessage,
    clearAuthFeedback: () => {
      setAuthError(null)
      setAuthMessage(null)
    },
    sendSignInCode,
    verifySignInCode,
    signOut,
  }
}
