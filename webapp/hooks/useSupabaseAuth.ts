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

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabase) {
      const error = new Error("Supabase client is unavailable.")
      setAuthError(mapSupabaseAuthError(error, "send_magic_link"))
      throw error
    }
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      const error = new Error("Email is required.")
      setAuthError(mapSupabaseAuthError(error, "send_magic_link"))
      throw error
    }

    setAuthError(null)
    setAuthMessage(`Sending magic link to ${normalizedEmail}...`)

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(mapSupabaseAuthError(error, "send_magic_link"))
      throw error
    }

    setAuthMessage("Magic link sent. Open it from your email. If the link opens in another tab, you can close that tab and continue in the editor. The email link may open in another browser tab.")
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
    signInWithMagicLink,
    signOut,
  }
}
