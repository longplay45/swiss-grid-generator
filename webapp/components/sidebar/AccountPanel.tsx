"use client"

import { ChevronUp, Download, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SectionHeaderRow } from "@/components/ui/section-header-row"
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
  cloudStatusIndicatorClassName: string
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

function formatLogDownloadFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `swiss-grid-generator-cloud-log-${timestamp}.txt`
}

function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AccountPanel({
  isDarkMode = false,
  onClose,
  userEmail,
  cloudStatusLabel,
  cloudStatusIndicatorClassName,
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
  const [downloadState, setDownloadState] = useState<"idle" | "downloaded" | "error">("idle")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tone = isDarkMode
    ? {
        body: "text-[#A8B1BF]",
        caption: "text-[#8D98AA]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        button: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        field: "border-[#313A47] bg-[#1D232D] text-[#F4F6F8]",
      }
    : {
        body: "text-gray-600",
        caption: "text-gray-400",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        button: "border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200 hover:text-gray-900",
        field: "border-gray-300 bg-white text-gray-900",
      }
  const fieldClassName = `rounded-md border px-3 py-2 text-xs ${tone.field}`
  const authButtonClassName = `h-auto rounded-md border px-3 py-2 text-xs ${tone.button}`
  const pairedHeaderValueClassName = tone.caption
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
    if (downloadState === "idle") return
    const timeout = window.setTimeout(() => setDownloadState("idle"), 1800)
    return () => window.clearTimeout(timeout)
  }, [downloadState])

  const feedbackSection = authError ? (
    <section className="space-y-2">
      <SectionHeaderRow label="Message" />
      <div className="rounded-md border border-[#fe9f97] bg-[#fe9f97]/10 px-3 py-2 text-xs text-[#c55a52] dark:text-[#fe9f97]">
        {authError}
      </div>
    </section>
  ) : authMessage ? (
    <section className="space-y-2">
      <SectionHeaderRow label="Message" />
      <div className={`rounded-md border px-3 py-2 text-xs ${tone.field}`}>
        {authMessage}
      </div>
    </section>
  ) : null

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <SectionHeaderRow
          label="A C C O U N T"
          actionIcon={<X className="h-2 w-2" />}
          actionLabel="Close account panel"
          actionClassName={tone.action}
          onActionClick={onClose}
        />
      </div>

      <section className="space-y-2">
        <SectionHeaderRow label="Cloud" />
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          We use Supabase for cloud sync while the local offline cache keeps your project store available on this device.
        </p>
      </section>

      <section className="space-y-2">
        <SectionHeaderRow
          label="Status"
          value={cloudStatusLabel}
          valueClassName={pairedHeaderValueClassName}
          statusDotClassName={cloudStatusIndicatorClassName}
          actionIcon={(
            <ChevronUp
              className={`h-2 w-2 transition-transform ${isStatusOpen ? "rotate-180" : "rotate-90"}`}
              aria-hidden="true"
            />
          )}
          actionClassName={tone.action}
          aria-expanded={isStatusOpen}
          onRowClick={() => setIsStatusOpen((open) => !open)}
        />
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
            <div className="space-y-2">
              <div className={`text-[11px] leading-tight ${tone.caption}`}>
                {activityEntries.length} local {activityEntries.length === 1 ? "entry" : "entries"}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className={`${authButtonClassName} inline-flex items-center gap-1.5`}
                  onClick={async () => {
                    try {
                      const entries = await listCloudActivityLogEntries()
                      downloadTextFile(formatCloudActivityLogForSupport(entries), formatLogDownloadFilename())
                      setDownloadState("downloaded")
                    } catch {
                      setDownloadState("error")
                    }
                  }}
                >
                  <Download className="h-3 w-3" />
                  {downloadState === "downloaded" ? "Saved" : downloadState === "error" ? "Failed" : "Download"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {userEmail ? (
        <>
          <section className="space-y-2">
            <SectionHeaderRow
              label="Signed In As"
              value={userEmail}
              valueClassName={`text-right ${pairedHeaderValueClassName}`}
            />
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
          {feedbackSection}
        </>
      ) : (
        <section className="space-y-2">
          <SectionHeaderRow
            label="Sign In"
            value={(
              <Label
                className={`text-right text-[11px] leading-none ${tone.caption}`}
                htmlFor="account-panel-email"
              >
                Email
              </Label>
            )}
          />
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
          {feedbackSection}
          {hasPendingCode ? (
            <div className="space-y-2 pt-2">
              <SectionHeaderRow
                label="Code"
                value={pendingEmail}
                valueClassName={`text-right ${pairedHeaderValueClassName}`}
              />
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
    </div>
  )
}
