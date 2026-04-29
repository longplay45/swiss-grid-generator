import type { SupabaseClient } from "@supabase/supabase-js"

export type FeedbackScreenshot = {
  name: string
  type: "image/png" | "image/jpeg" | "image/webp"
  size: number
  base64Data: string
}

type FeedbackScreenshotMetadata = {
  name: string
  type: FeedbackScreenshot["type"]
  size: number
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
  const feedbackMessageId = crypto.randomUUID()
  const screenshotMetadata: FeedbackScreenshotMetadata[] = input.screenshots.map((screenshot) => ({
    name: screenshot.name,
    type: screenshot.type,
    size: screenshot.size,
  }))
  const payload: Record<string, unknown> = {
    id: feedbackMessageId,
    user_id: input.userId,
    email: input.email,
    comment: input.comment,
    screenshots: screenshotMetadata,
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

  for (const [index, screenshot] of input.screenshots.entries()) {
    const { error: screenshotError } = await supabase.rpc("add_feedback_screenshot", {
      feedback_message_id: feedbackMessageId,
      screenshot_position: index,
      screenshot_name: screenshot.name,
      screenshot_type: screenshot.type,
      screenshot_size: screenshot.size,
      screenshot_base64: screenshot.base64Data,
    })

    if (screenshotError) {
      throw screenshotError
    }
  }
}
