"use client"

export type UserFacingNotice = {
  title: string
  message: string
}

export type SupabaseAuthErrorContext = "send_magic_link" | "sign_out" | "session"

type ErrorLike = {
  message?: string
  code?: string
  status?: number
}

function toErrorLike(error: unknown): ErrorLike {
  if (!error || typeof error !== "object") {
    return {}
  }
  return error as ErrorLike
}

function getErrorMessage(error: unknown, fallback: string): string {
  const { message } = toErrorLike(error)
  return typeof message === "string" && message.trim().length > 0 ? message.trim() : fallback
}

function isNetworkLikeMessage(message: string): boolean {
  return /failed to fetch|fetch failed|network ?request failed|load failed|network error/i.test(message)
}

function isAuthRateLimitMessage(message: string): boolean {
  return /email rate limit exceeded|too many requests|rate limit/i.test(message)
}

function getSupabaseAuthFallback(context: SupabaseAuthErrorContext): string {
  if (context === "sign_out") return "Could not sign out of the cloud account."
  if (context === "session") return "Could not restore the cloud session."
  return "Could not send the sign-in link."
}

export function mapSupabaseAuthError(error: unknown, context: SupabaseAuthErrorContext = "send_magic_link"): string {
  const rawMessage = getErrorMessage(error, getSupabaseAuthFallback(context))
  const { status } = toErrorLike(error)

  if (/supabase environment variables are missing/i.test(rawMessage)) {
    return "Cloud auth is unavailable. Check the Supabase URL and anon key in the local environment."
  }

  if (/email is required/i.test(rawMessage)) {
    return "Enter an email address before requesting a sign-in link."
  }

  if (status === 429 || isAuthRateLimitMessage(rawMessage)) {
    return "Too many sign-in emails were requested. Wait a moment and try again. If this keeps happening, check the Supabase Auth rate limits and SMTP setup."
  }

  if (typeof status === "number" && status >= 500) {
    if (context === "sign_out") {
      return "Supabase is temporarily unavailable and could not complete sign-out. Wait a moment and try again."
    }
    if (context === "session") {
      return "Supabase is temporarily unavailable and the cloud session could not be restored right now. Wait a moment and try again."
    }
    return "Supabase is temporarily unavailable and could not send the sign-in link. Wait a moment and try again."
  }

  if (/email address not authorized/i.test(rawMessage)) {
    return "This email address is not allowed by the current Supabase mail configuration. Check the SMTP sender setup or authorized test addresses."
  }

  if (/redirect/i.test(rawMessage) && /invalid|not allowed|mismatch/i.test(rawMessage)) {
    return "This sign-in redirect is not allowed. Check Supabase Authentication URL Configuration for the current app origin."
  }

  if (isNetworkLikeMessage(rawMessage)) {
    if (context === "sign_out") {
      return "Could not reach Supabase to sign out. Check the network connection and try again."
    }
    if (context === "session") {
      return "Could not reach Supabase to restore the cloud session. Check the network connection and try again."
    }
    return "Could not reach Supabase. Check the network connection and the configured project URL, then try again."
  }

  if (context === "sign_out") {
    return `Could not sign out of the cloud account. Supabase said: ${rawMessage}`
  }
  if (context === "session") {
    return `Could not restore the cloud session. Supabase said: ${rawMessage}`
  }
  return `Could not send the sign-in link. Supabase said: ${rawMessage}`
}

export const CLOUD_SYNC_CONFLICT_NOTICE: UserFacingNotice = {
  title: "Cloud Sync Conflict",
  message: "The local project and the cloud copy changed at the same time. The local project was kept and marked as conflicted.",
}

export function mapCloudSyncError(error: unknown): UserFacingNotice {
  const rawMessage = getErrorMessage(error, "Cloud sync failed.")
  const { status, code } = toErrorLike(error)

  if (status === 401 || /jwt|token.*expired|auth session missing|invalid token|not authenticated/i.test(rawMessage)) {
    return {
      title: "Cloud Session Expired",
      message: "The cloud session is no longer valid. Sign in again to resume sync.",
    }
  }

  if (status === 403 || /permission denied|row-level security|violates row-level security/i.test(rawMessage)) {
    return {
      title: "Cloud Permissions Error",
      message: "Cloud sync is blocked by Supabase permissions. Check the projects table RLS policies and the storage bucket policies.",
    }
  }

  if (/bucket.*not found|project-archives.*not found|storage.*not found/i.test(rawMessage)) {
    return {
      title: "Cloud Storage Missing",
      message: "The `project-archives` storage bucket is missing or inaccessible. Check the bucket name and storage policies in Supabase.",
    }
  }

  if (/relation .*projects.* does not exist|column .* does not exist|schema cache/i.test(rawMessage)) {
    return {
      title: "Cloud Database Setup Incomplete",
      message: "The Supabase `projects` table or its expected columns are missing. Run the SQL setup for the cloud project store again.",
    }
  }

  if (status === 429 || /rate limit/i.test(rawMessage)) {
    return {
      title: "Cloud Rate Limit Reached",
      message: "Supabase temporarily refused more cloud requests. Wait a moment and try again.",
    }
  }

  if (typeof status === "number" && status >= 500) {
    return {
      title: "Cloud Service Unavailable",
      message: "Supabase is temporarily unavailable. Local changes remain safe in Dexie and will sync when the service recovers.",
    }
  }

  if (isNetworkLikeMessage(rawMessage) || code === "20") {
    return {
      title: "Cloud Offline",
      message: "Could not reach Supabase. Local changes remain in Dexie and can sync when the connection returns.",
    }
  }

  return {
    title: "Cloud Sync Error",
    message: `Cloud sync failed. Supabase said: ${rawMessage}`,
  }
}
