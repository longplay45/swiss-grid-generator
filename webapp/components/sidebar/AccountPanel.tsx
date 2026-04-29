"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

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
  const hasPendingCode = !userEmail && Boolean(pendingEmail)

  useEffect(() => {
    if (!userEmail) return
    setPendingEmail(null)
    setCodeDraft("")
    setEmailDraft(userEmail)
  }, [userEmail])

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
        <div className="flex items-start justify-between gap-3">
          <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Status</h4>
          <div className={`pt-[1px] text-right text-[11px] leading-tight ${tone.caption}`}>
            {cloudStatusLabel}
          </div>
        </div>
      </section>

      {userEmail ? (
        <section className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Sign In</h4>
            <div className={`pt-[1px] text-right text-[11px] leading-tight ${tone.caption}`}>
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

      {authMessage && !userEmail ? (
        <section className="space-y-2">
          <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Message</h4>
          <div className={`rounded-md border px-3 py-2 text-xs ${tone.field}`}>
            {authMessage}
          </div>
        </section>
      ) : null}
    </div>
  )
}
