"use client"

import { ChevronUp, Clipboard, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"
import {
  cloudActivityLogQuery,
  formatCloudActivityLogForSupport,
  listCloudActivityLogEntries,
  type CloudActivityLogEntry,
} from "@/lib/user-layout-library"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
  userEmail: string | null
  cloudStatusLabel: string
  authError: string | null
  authMessage: string | null
  onClearFeedback: () => void
  onSendSignInCode: (email: string) => Promise<void>
  onVerifySignInCode: (email: string, code: string) => Promise<void>
  onSignOut: () => Promise<void>
}

function formatActivityTimestamp(value: string | null | undefined, mode: "full" | "time" = "full"): string {
  if (!value) return "No events"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (mode === "time") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`
}

function getActivityLevelClassName(level: CloudActivityLogEntry["level"], isDarkMode: boolean): string {
  if (level === "success") return isDarkMode ? "text-[#9AC99A]" : "text-[#2f7d32]"
  if (level === "warning") return isDarkMode ? "text-[#f2c182]" : "text-[#9a621f]"
  if (level === "error") return isDarkMode ? "text-[#fe9f97]" : "text-[#c55a52]"
  return isDarkMode ? "text-[#F4F6F8]" : "text-gray-900"
}

export function AccountPanel({
  isDarkMode = false,
  onClose,
  userEmail,
  cloudStatusLabel,
  authError,
  authMessage,
  onClearFeedback,
  onSendSignInCode,
  onVerifySignInCode,
  onSignOut,
}: Props) {
  const [emailDraft, setEmailDraft] = useState(userEmail ?? "")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [codeDraft, setCodeDraft] = useState("")
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [activityEntries, setActivityEntries] = useState<CloudActivityLogEntry[]>([])
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tone = isDarkMode
    ? {
        body: "text-[#A8B1BF]",
        caption: "text-[#8D98AA]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        field: "border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
      }
    : {
        body: "text-gray-600",
        caption: "text-gray-400",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        field: "border-gray-300 bg-white text-gray-900",
      }
  const fieldClassName = `rounded-md border px-3 py-2 text-xs ${tone.field}`
  const authButtonClassName = "h-auto rounded-md px-3 py-2 text-xs"
  const pairedHeaderLabelClassName = `${SECTION_HEADLINE_CLASSNAME} mb-0 leading-none`
  const pairedHeaderValueClassName = `min-w-0 truncate text-[11px] leading-none ${tone.caption}`
  const hasPendingCode = !userEmail && Boolean(pendingEmail)
  const latestActivityTimestamp = activityEntries[0]?.createdAt ?? null
  const latestActivityLabel = useMemo(() => formatActivityTimestamp(latestActivityTimestamp), [latestActivityTimestamp])

  useEffect(() => {
    if (!userEmail) return
    setPendingEmail(null)
    setCodeDraft("")
    setEmailDraft(userEmail)
  }, [userEmail])

  useEffect(() => {
    const subscription = cloudActivityLogQuery.subscribe({
      next: setActivityEntries,
      error: () => setActivityEntries([]),
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (copyState === "idle") return
    const timeout = window.setTimeout(() => setCopyState("idle"), 1800)
    return () => window.clearTimeout(timeout)
  }, [copyState])

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>A C C O U N T</h3>
          </div>
          <button
            type="button"
            aria-label="Close account panel"
            onClick={onClose}
            className={`mt-[2px] inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${tone.action}`}
          >
            <X className="h-2 w-2" />
          </button>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Cloud</h4>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Supabase sync uses Dexie as the local offline cache and keeps the cloud project store in sync while signed in.
        </p>
      </section>

      <section className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={isStatusOpen}
          onClick={() => setIsStatusOpen((open) => !open)}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className={pairedHeaderLabelClassName}>Status</span>
            <span className={pairedHeaderValueClassName}>
              {cloudStatusLabel}
            </span>
          </span>
          <span className={`relative top-[-3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${tone.action}`}>
            <ChevronUp
              className={`h-2 w-2 transition-transform ${isStatusOpen ? "rotate-180" : "rotate-90"}`}
              aria-hidden="true"
            />
          </span>
        </button>
        {isStatusOpen ? (
          <div className={`space-y-2 border-t pt-2 text-xs ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className={tone.body}>Last Event</div>
              <div className={`text-right text-[11px] leading-tight ${tone.caption}`}>
                {latestActivityLabel}
              </div>
            </div>
            <div className={`max-h-48 overflow-y-auto border-y py-1 ${isDarkMode ? "border-[#313A47]" : "border-gray-200"}`}>
              {activityEntries.length > 0 ? (
                <div className="space-y-1">
                  {activityEntries.slice(0, 12).map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[54px_1fr] gap-2 py-1 text-[11px] leading-snug">
                      <div className={`tabular-nums ${tone.caption}`}>
                        {formatActivityTimestamp(entry.createdAt, "time")}
                      </div>
                      <div className="min-w-0">
                        <div className={getActivityLevelClassName(entry.level, isDarkMode)}>
                          {entry.action}
                        </div>
                        {entry.projectTitle || entry.message ? (
                          <div className={`truncate ${tone.caption}`}>
                            {[entry.projectTitle, entry.message].filter(Boolean).join(" · ")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`py-2 text-[11px] ${tone.caption}`}>No local cloud activity yet.</div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className={`text-[11px] leading-tight ${tone.caption}`}>
                {activityEntries.length} local {activityEntries.length === 1 ? "entry" : "entries"}
              </div>
              <Button
                size="sm"
                className={`${authButtonClassName} inline-flex items-center gap-1.5`}
                onClick={async () => {
                  try {
                    const entries = await listCloudActivityLogEntries()
                    await navigator.clipboard.writeText(formatCloudActivityLogForSupport(entries))
                    setCopyState("copied")
                  } catch {
                    setCopyState("error")
                  }
                }}
              >
                <Clipboard className="h-3 w-3" />
                {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy Failed" : "Copy Log"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {userEmail ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className={pairedHeaderLabelClassName}>Signed In As</h4>
            <div className={`text-right ${pairedHeaderValueClassName}`}>
              {userEmail}
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              className={authButtonClassName}
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  await onSignOut()
                  onClearFeedback()
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              Sign Out
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Sign In</h4>
            <Label
              className={`pt-[1px] text-right text-[11px] leading-tight ${tone.caption}`}
              htmlFor="account-panel-email"
            >
              Email
            </Label>
          </div>
          <input
            id="account-panel-email"
            type="email"
            value={emailDraft}
            onChange={(event) => {
              const nextEmail = event.target.value
              setEmailDraft(nextEmail)
              if (pendingEmail && nextEmail.trim() !== pendingEmail) {
                setPendingEmail(null)
                setCodeDraft("")
              }
              if (authError || authMessage) onClearFeedback()
            }}
            className={`w-full ${fieldClassName}`}
            placeholder="name@example.com"
          />
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              className={authButtonClassName}
              disabled={isSubmitting || !emailDraft.trim()}
              onClick={async () => {
                setIsSubmitting(true)
                try {
                  const normalizedEmail = emailDraft.trim()
                  await onSendSignInCode(normalizedEmail)
                  setPendingEmail(normalizedEmail)
                  setEmailDraft(normalizedEmail)
                  setCodeDraft("")
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {hasPendingCode ? "Resend Code" : "Send Code"}
            </Button>
          </div>
          {authMessage ? (
            <section className="space-y-2 pt-2">
              <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Message</h4>
              <div className={`rounded-md border px-3 py-2 text-xs ${tone.field}`}>
                {authMessage}
              </div>
            </section>
          ) : null}
          {hasPendingCode ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-start justify-between gap-3">
                <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Code</h4>
                <div className={`pt-[1px] text-right text-[11px] leading-tight ${tone.caption}`}>
                  {pendingEmail}
                </div>
              </div>
              <input
                id="account-panel-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codeDraft}
                onChange={(event) => {
                  setCodeDraft(event.target.value.replace(/\D/g, "").slice(0, 6))
                  if (authError || authMessage) onClearFeedback()
                }}
                className={`w-full text-center font-mono tabular-nums ${fieldClassName}`}
                placeholder="000000"
              />
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  className={authButtonClassName}
                  disabled={isSubmitting || codeDraft.length !== 6}
                  onClick={async () => {
                    if (!pendingEmail) return
                    setIsSubmitting(true)
                    try {
                      await onVerifySignInCode(pendingEmail, codeDraft)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                >
                  Verify Code
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {authError ? (
        <section className="space-y-2">
          <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Message</h4>
          <div className="rounded-md border border-[#fe9f97] bg-[#fe9f97]/10 px-3 py-2 text-xs text-[#c55a52] dark:text-[#fe9f97]">
            {authError}
          </div>
        </section>
      ) : null}
    </div>
  )
}
