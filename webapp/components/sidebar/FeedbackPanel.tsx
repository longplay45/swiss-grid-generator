"use client"

import { Paperclip, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"
import {
  addCloudActivityLogEntry,
  formatCloudActivityLogForSupport,
  listCloudActivityLogEntries,
} from "@/lib/user-layout-library"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { submitFeedbackMessage, type FeedbackScreenshot } from "@/lib/supabase/feedback"

const MAX_SCREENSHOTS = 3
const MAX_SCREENSHOT_BYTES = 1_000_000
const MAX_TOTAL_SCREENSHOT_BYTES = 3_000_000
const ACCEPTED_SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const

type FeedbackFormState = {
  email: string
  comment: string
}

type FieldKey = keyof FeedbackFormState | "screenshots"

type Props = {
  isDarkMode?: boolean
  appVersion: string
  userId: string | null
  userEmail: string | null
  onClose: () => void
}

const INITIAL_FORM_STATE: FeedbackFormState = {
  email: "",
  comment: "",
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>{title}</h4>
      {children}
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">{message}</p>
}

function formatBytes(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`
  if (value >= 1_000) return `${Math.round(value / 1_000)} KB`
  return `${value} B`
}

function isAcceptedScreenshotType(value: string): value is FeedbackScreenshot["type"] {
  return ACCEPTED_SCREENSHOT_TYPES.includes(value as FeedbackScreenshot["type"])
}

function getScreenshotValidationError(files: File[]) {
  if (files.length > MAX_SCREENSHOTS) {
    return `Attach no more than ${MAX_SCREENSHOTS} screenshots.`
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  if (totalBytes > MAX_TOTAL_SCREENSHOT_BYTES) {
    return `Screenshots must stay below ${formatBytes(MAX_TOTAL_SCREENSHOT_BYTES)} total.`
  }

  const invalidFile = files.find((file) => !isAcceptedScreenshotType(file.type))
  if (invalidFile) {
    return `${invalidFile.name} is not a PNG, JPEG, or WebP image.`
  }

  const oversizedFile = files.find((file) => file.size > MAX_SCREENSHOT_BYTES)
  if (oversizedFile) {
    return `${oversizedFile.name} is larger than ${formatBytes(MAX_SCREENSHOT_BYTES)}.`
  }

  return null
}

function getValidationErrors(
  values: FeedbackFormState,
  screenshotFiles: File[],
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {}
  const email = values.email.trim()
  const comment = values.comment.trim()

  if (!email) {
    errors.email = "Email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address."
  }

  if (!comment) {
    errors.comment = "Comment is required."
  } else if (comment.length > 4000) {
    errors.comment = "Keep the comment below 4000 characters."
  }

  const screenshotError = getScreenshotValidationError(screenshotFiles)
  if (screenshotError) {
    errors.screenshots = screenshotError
  }

  return errors
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const [, base64Data] = reader.result.split(",", 2)
        if (base64Data) {
          resolve(base64Data)
          return
        }
        reject(new Error("Screenshot could not be encoded."))
        return
      }
      reject(new Error("Screenshot could not be read."))
    }
    reader.onerror = () => reject(reader.error ?? new Error("Screenshot could not be read."))
    reader.readAsDataURL(file)
  })
}

async function buildScreenshotPayload(files: File[]): Promise<FeedbackScreenshot[]> {
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type as FeedbackScreenshot["type"],
      size: file.size,
      base64Data: await readFileAsBase64(file),
    })),
  )
}

function getFeedbackSubmitErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : ""
  const rawDetails = typeof error === "object" && error && "details" in error && typeof error.details === "string"
    ? error.details
    : ""
  const rawHint = typeof error === "object" && error && "hint" in error && typeof error.hint === "string"
    ? error.hint
    : ""
  const diagnosticText = [rawMessage, rawDetails, rawHint].filter(Boolean).join(" ")

  if (/support_log|column .* does not exist|schema cache/i.test(diagnosticText)) {
    return "Feedback log column is missing. Run the support_log SQL migration in Supabase, then try again."
  }

  if (/add_feedback_screenshot|feedback_screenshots|function .* does not exist/i.test(diagnosticText)) {
    return "Feedback screenshot storage is missing. Run the feedback_screenshots SQL migration in Supabase, then try again."
  }

  if (/ambiguous|column reference .* ambiguous|variable_conflict/i.test(diagnosticText)) {
    return "Feedback screenshot storage failed because the Supabase RPC has an ambiguous SQL parameter. Replace the add_feedback_screenshot function with the corrected version."
  }

  if (/row-level security|violates row-level security|permission denied/i.test(diagnosticText)) {
    return "Feedback could not be sent because the Supabase insert policy rejected it."
  }

  if (/screenshots|check constraint|feedback_messages_screenshots/i.test(diagnosticText)) {
    return "Feedback could not be sent because an attachment exceeds the Supabase limits."
  }

  return "Feedback could not be sent. Check Supabase configuration or try again later."
}

export function FeedbackPanel({ isDarkMode = false, appVersion, userId, userEmail, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<FeedbackFormState>(() => ({
    ...INITIAL_FORM_STATE,
    email: userEmail?.trim() ?? "",
  }))
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [attachSupportLog, setAttachSupportLog] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  useEffect(() => {
    const signedInEmail = userEmail?.trim()
    if (!signedInEmail) return
    setForm((current) => current.email === signedInEmail ? current : { ...current, email: signedInEmail })
    setErrors((current) => {
      if (!current.email) return current
      const next = { ...current }
      delete next.email
      return next
    })
  }, [userEmail])

  const tone = isDarkMode
    ? {
        heading: "text-gray-100",
        body: "text-[#A8B1BF]",
        caption: "text-[#8D98AA]",
        divider: "border-gray-700",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        button: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        field: "border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
        success: "border-[#9AC99A] bg-[#9AC99A]/10 text-[#9AC99A]",
        error: "border-[#fe9f97] bg-[#fe9f97]/10 text-[#fe9f97]",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        caption: "text-gray-400",
        divider: "border-gray-200",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        button: "border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200 hover:text-gray-900",
        field: "border-gray-300 bg-white text-gray-900",
        success: "border-[#9AC99A] bg-[#9AC99A]/10 text-[#2f7d32]",
        error: "border-[#fe9f97] bg-[#fe9f97]/10 text-[#c55a52]",
      }
  const fieldClassName = `rounded-md border px-3 py-2 text-xs ${tone.field}`
  const feedbackButtonClassName = `h-auto rounded-md border px-3 py-2 text-xs ${tone.button}`
  const attachmentClassName = `rounded-md border px-3 py-2 text-xs ${tone.field}`

  const setField = <K extends keyof FeedbackFormState,>(key: K, value: FeedbackFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    if (submitMessage) {
      setSubmitMessage(null)
    }
  }

  const scrollPanelToTop = () => {
    const scrollRoot = rootRef.current?.closest<HTMLElement>('[data-help-scroll-root="true"]')
    if (scrollRoot) {
      scrollRoot.scrollTo({ top: 0 })
    }
  }

  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (selectedFiles.length === 0) return

    const nextFiles = [...screenshotFiles, ...selectedFiles]
    const validationError = getScreenshotValidationError(nextFiles)
    if (validationError) {
      setErrors((current) => ({ ...current, screenshots: validationError }))
      return
    }

    setScreenshotFiles(nextFiles)
    setErrors((current) => {
      if (!current.screenshots) return current
      const next = { ...current }
      delete next.screenshots
      return next
    })
    if (submitMessage) {
      setSubmitMessage(null)
    }
  }

  const handleRemoveScreenshot = (index: number) => {
    setScreenshotFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setErrors((current) => {
      if (!current.screenshots) return current
      const next = { ...current }
      delete next.screenshots
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = getValidationErrors(form, screenshotFiles)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage("Some required fields need attention.")
      scrollPanelToTop()
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)
    void addCloudActivityLogEntry({
      level: "info",
      action: "Feedback submit requested",
      message: attachSupportLog ? "local log attached" : undefined,
    })

    try {
      const supabase = getSupabaseBrowserClient()
      const screenshots = await buildScreenshotPayload(screenshotFiles)
      const supportLog = attachSupportLog
        ? formatCloudActivityLogForSupport(await listCloudActivityLogEntries())
        : null

      await submitFeedbackMessage(supabase, {
        userId,
        email: form.email.trim(),
        comment: form.comment.trim(),
        screenshots,
        supportLog,
        pageUrl: window.location.href,
        userAgent: window.navigator.userAgent,
        appVersion,
      })

      setHasSubmitted(true)
      setErrors({})
      setSubmitMessage(null)
      setScreenshotFiles([])
      setAttachSupportLog(false)
      void addCloudActivityLogEntry({
        level: "success",
        action: "Feedback sent",
        message: screenshotFiles.length > 0
          ? `${screenshotFiles.length} ${screenshotFiles.length === 1 ? "screenshot" : "screenshots"}`
          : undefined,
      })
      scrollPanelToTop()
    } catch (error) {
      const message = getFeedbackSubmitErrorMessage(error)
      const rawMessage = error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error && typeof error.message === "string"
          ? error.message
          : undefined
      setSubmitMessage(message)
      void addCloudActivityLogEntry({
        level: "error",
        action: "Feedback failed",
        message: rawMessage ? `${message} (${rawMessage})` : message,
      })
      scrollPanelToTop()
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderInput = ({
    field,
    placeholder,
    type = "text",
    id,
  }: {
    field: keyof FeedbackFormState
    placeholder: string
    type?: "text" | "email"
    id?: string
  }) => (
    <div className="space-y-1.5">
      <input
        id={id}
        type={type}
        value={form[field]}
        onChange={(event) => setField(field, event.target.value)}
        className={`w-full ${fieldClassName}`}
        placeholder={placeholder}
        autoComplete={type === "email" ? "email" : undefined}
        inputMode={type === "email" ? "email" : undefined}
      />
      <FieldError message={errors[field]} />
    </div>
  )

  const renderTextarea = () => (
    <div className="space-y-1.5">
      <textarea
        value={form.comment}
        onChange={(event) => setField("comment", event.target.value)}
        rows={7}
        className={`w-full resize-none ${fieldClassName}`}
        placeholder="Describe the issue, idea, or workflow problem."
      />
      <div className={`flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.08em] ${tone.caption}`}>
        <span>Required</span>
        <span>{form.comment.trim().length}/4000</span>
      </div>
      <FieldError message={errors.comment} />
    </div>
  )

  const renderSupportLogCheckbox = () => (
    <label className={`flex min-h-9 items-center gap-2 ${attachmentClassName}`}>
      <input
        type="checkbox"
        checked={attachSupportLog}
        onChange={(event) => setAttachSupportLog(event.target.checked)}
        className="h-3.5 w-3.5 accent-[#fbae17]"
      />
      <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
        Attach Local Log
      </span>
    </label>
  )

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="rounded-md py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>F E E D B A C K</h3>
          </div>
          <button
            type="button"
            aria-label="Close feedback panel"
            onClick={onClose}
            className={`mt-[2px] inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${tone.action}`}
          >
            <X className="h-2 w-2" />
          </button>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Message</h4>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Send a concise note with optional screenshots.
        </p>
      </section>

      {submitMessage ? (
        <div className={`rounded-md border px-3 py-2 text-xs ${tone.error}`}>
          {submitMessage}
        </div>
      ) : null}

      {hasSubmitted ? (
        <div className="space-y-4">
          <div className={`rounded-md border px-3 py-2 text-xs ${tone.success}`}>
            Thank you. Your feedback has been sent.
          </div>
        </div>
      ) : (
        <form className={`space-y-4 ${tone.body}`} onSubmit={handleSubmit} noValidate>
          <section className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Contact</h4>
              <Label
                className={`pt-[1px] text-right text-[11px] leading-tight ${tone.caption}`}
                htmlFor="feedback-panel-email"
              >
                Email
              </Label>
            </div>
            {renderInput({
              field: "email",
              type: "email",
              id: "feedback-panel-email",
              placeholder: "name@example.com",
            })}
          </section>

          <Section title="Comment">
            {renderTextarea()}
          </Section>

          <Section title="Screenshots">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_SCREENSHOT_TYPES.join(",")}
              multiple
              className="hidden"
              onChange={handleScreenshotChange}
            />
            <div className="space-y-2">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={screenshotFiles.length >= MAX_SCREENSHOTS}
                className={`${feedbackButtonClassName} inline-flex w-full items-center justify-center gap-1.5 disabled:cursor-not-allowed`}
              >
                <Paperclip className="h-3 w-3" />
                Attach Screenshots
              </Button>
              <p className={`text-[10px] uppercase tracking-[0.08em] ${tone.caption}`}>
                Up to {MAX_SCREENSHOTS} images. {formatBytes(MAX_SCREENSHOT_BYTES)} each.
              </p>
            </div>
            {screenshotFiles.length > 0 ? (
              <div className="space-y-1.5">
                {screenshotFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className={`flex min-h-9 items-center gap-2 ${attachmentClassName}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium leading-tight">{file.name}</p>
                      <p className={`text-[10px] leading-tight ${tone.caption}`}>{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => handleRemoveScreenshot(index)}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center transition-colors ${isDarkMode ? "text-gray-400 hover:text-gray-100" : "text-gray-500 hover:text-gray-900"}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <FieldError message={errors.screenshots} />
          </Section>

          <Section title="Support">
            {renderSupportLogCheckbox()}
          </Section>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={`${feedbackButtonClassName} w-full`}
            >
              {isSubmitting ? "Sending..." : "Send Feedback"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
