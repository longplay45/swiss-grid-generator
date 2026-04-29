import type { SupabaseClient } from "@supabase/supabase-js"

export type FeedbackScreenshot = {
  name: string
  type: "image/png" | "image/jpeg" | "image/webp"
  size: number
  data: string
}

type SubmitFeedbackMessageInput = {
  userId: string | null
  email: string
  comment: string
  screenshots: FeedbackScreenshot[]
  supportLog: string | null
  pageUrl: string
  userAgent: string
  appVersion: string
}

export async function submitFeedbackMessage(
  supabase: SupabaseClient,
  input: SubmitFeedbackMessageInput,
) {
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    email: input.email,
    comment: input.comment,
    screenshots: input.screenshots,
    page_url: input.pageUrl,
    user_agent: input.userAgent,
    app_version: input.appVersion,
  }

  if (input.supportLog !== null) {
    payload.support_log = input.supportLog
  }

  const { error } = await supabase
    .from("feedback_messages")
    .insert(payload)

  if (error) {
    throw error
  }
}
