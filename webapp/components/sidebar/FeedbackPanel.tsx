"use client"

import { X } from "lucide-react"
import { useRef, useState, type FormEvent, type ReactNode } from "react"

const FEEDBACK_API_URL = process.env.NEXT_PUBLIC_FEEDBACK_API_URL ?? "/feedback/survey-api.php"

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
] as const

const FREQUENCY_OPTIONS = [
  { value: "once", label: "Once" },
  { value: "2-3-times", label: "2-3 times" },
  { value: "regularly", label: "Regularly" },
] as const

const BUG_OPTIONS = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
] as const

const LIKERT_VALUES = [1, 2, 3, 4, 5] as const
const NPS_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

type ExperienceValue = (typeof EXPERIENCE_OPTIONS)[number]["value"]
type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"]
type BugsValue = (typeof BUG_OPTIONS)[number]["value"]

type FeedbackFormState = {
  experience: ExperienceValue | ""
  frequency: FrequencyValue | ""
  understand: number | null
  easystart: number | null
  intuitive: number | null
  firstresult: number | null
  first_confusion: string
  what_worked: string
  bugs_found: BugsValue | ""
  bug_description: string
  job_to_be_done: string
  alternatives: string
  top_improvement: string
  missing_features: string
  anything_else: string
  nps_score: number | null
}

type FieldKey = keyof FeedbackFormState

type Props = {
  isDarkMode?: boolean
  appVersion: string
  onClose: () => void
}

const INITIAL_FORM_STATE: FeedbackFormState = {
  experience: "",
  frequency: "",
  understand: null,
  easystart: null,
  intuitive: null,
  firstresult: null,
  first_confusion: "",
  what_worked: "",
  bugs_found: "",
  bug_description: "",
  job_to_be_done: "",
  alternatives: "",
  top_improvement: "",
  missing_features: "",
  anything_else: "",
  nps_score: null,
}

function Section({
  number,
  title,
  description,
  borderClassName,
  children,
}: {
  number: string
  title: string
  description?: string
  borderClassName: string
  children: ReactNode
}) {
  return (
    <section className={`space-y-3 border-t pt-4 ${borderClassName}`}>
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">{number}</p>
        <h4 className="text-xs font-semibold uppercase tracking-[0.08em]">{title}</h4>
        {description ? <p className="text-[11px] leading-relaxed opacity-80">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] leading-relaxed text-red-600 dark:text-red-400">{message}</p>
}

function getValidationErrors(values: FeedbackFormState): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {}

  if (!values.experience) errors.experience = "Select your grid-system experience."
  if (values.understand === null) errors.understand = "Rate this statement."
  if (values.easystart === null) errors.easystart = "Rate this statement."
  if (values.intuitive === null) errors.intuitive = "Rate this statement."
  if (values.firstresult === null) errors.firstresult = "Rate this statement."
  if (values.bugs_found === "yes" && !values.bug_description.trim()) {
    errors.bug_description = "Describe the issue you ran into."
  }
  if (values.nps_score === null) errors.nps_score = "Choose a score from 0 to 10."

  return errors
}

export function FeedbackPanel({ isDarkMode = false, appVersion, onClose }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<FeedbackFormState>(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const tone = isDarkMode
    ? {
        heading: "text-gray-100",
        body: "text-gray-300",
        caption: "text-gray-500",
        divider: "border-gray-700",
        input: "border-gray-700 bg-gray-950 text-gray-100 placeholder:text-gray-500 focus:border-gray-400",
        option:
          "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 peer-checked:border-gray-100 peer-checked:bg-gray-100 peer-checked:text-gray-900",
        optionMuted: "text-gray-400",
        button:
          "border-gray-100 bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:border-gray-700 disabled:bg-gray-800 disabled:text-gray-500",
        buttonSecondary:
          "border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800",
        success: "border-emerald-700/70 bg-emerald-950/40 text-emerald-300",
        error: "border-red-700/70 bg-red-950/30 text-red-300",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        caption: "text-gray-500",
        divider: "border-gray-200",
        input: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-900",
        option:
          "border-gray-300 bg-white text-gray-700 hover:bg-gray-100 peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white",
        optionMuted: "text-gray-500",
        button:
          "border-gray-900 bg-gray-900 text-white hover:bg-gray-700 disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500",
        buttonSecondary:
          "border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        error: "border-red-200 bg-red-50 text-red-700",
      }

  const setField = <K extends FieldKey,>(key: K, value: FeedbackFormState[K]) => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = getValidationErrors(form)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage("Some required responses are still missing.")
      scrollPanelToTop()
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const response = await fetch(FEEDBACK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema_version: 1,
          app_version: appVersion,
          ...form,
          first_confusion: form.first_confusion.trim(),
          what_worked: form.what_worked.trim(),
          bug_description: form.bug_description.trim(),
          job_to_be_done: form.job_to_be_done.trim(),
          alternatives: form.alternatives.trim(),
          top_improvement: form.top_improvement.trim(),
          missing_features: form.missing_features.trim(),
          anything_else: form.anything_else.trim(),
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        setSubmitMessage(payload?.error ?? "Feedback could not be sent. Please try again.")
        if (payload?.fields && typeof payload.fields === "object") {
          setErrors((current) => ({ ...current, ...payload.fields }))
        }
        scrollPanelToTop()
        return
      }

      setHasSubmitted(true)
      setErrors({})
      setSubmitMessage(null)
      scrollPanelToTop()
    } catch {
      setSubmitMessage("Feedback could not be sent. Check the connection or backend deployment.")
      scrollPanelToTop()
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderChoiceGrid = <T extends string>({
    name,
    value,
    options,
    onChange,
    columnsClassName,
  }: {
    name: string
    value: T | ""
    options: ReadonlyArray<{ value: T; label: string }>
    onChange: (next: T) => void
    columnsClassName: string
  }) => (
    <div className={`grid gap-1.5 ${columnsClassName}`}>
      {options.map((option) => (
        <label key={option.value} className="block">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span className={`flex min-h-9 items-center justify-center border px-2 py-2 text-center text-[11px] leading-tight transition-colors ${tone.option}`}>
            {option.label}
          </span>
        </label>
      ))}
    </div>
  )

  const renderScaleGrid = ({
    name,
    value,
    values,
    columnsClassName,
    onChange,
  }: {
    name: string
    value: number | null
    values: readonly number[]
    columnsClassName: string
    onChange: (next: number) => void
  }) => (
    <div className={`grid gap-1.5 ${columnsClassName}`}>
      {values.map((item) => (
        <label key={item} className="block">
          <input
            type="radio"
            name={name}
            value={item}
            checked={value === item}
            onChange={() => onChange(item)}
            className="peer sr-only"
          />
          <span className={`flex min-h-9 items-center justify-center border px-1 py-2 text-[11px] font-medium transition-colors ${tone.option}`}>
            {item}
          </span>
        </label>
      ))}
    </div>
  )

  const renderTextarea = ({
    field,
    label,
    placeholder,
    rows = 4,
  }: {
    field: Exclude<FieldKey, "experience" | "frequency" | "understand" | "easystart" | "intuitive" | "firstresult" | "bugs_found" | "nps_score">
    label: string
    placeholder: string
    rows?: number
  }) => (
    <div className="space-y-1.5">
      <label className={`block text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
        {label}
      </label>
      <textarea
        value={form[field]}
        onChange={(event) => setField(field, event.target.value)}
        rows={rows}
        className={`w-full border px-3 py-2 text-xs leading-relaxed outline-none transition-colors ${tone.input}`}
        placeholder={placeholder}
      />
      <FieldError message={errors[field]} />
    </div>
  )

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className={`text-sm font-semibold ${tone.heading}`}>Feedback</h3>
          <p className={`text-[11px] leading-relaxed ${tone.body}`}>
            Help improve the tool. The survey takes about 5 minutes and responses are anonymous.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close feedback panel"
          onClick={onClose}
          className={`rounded-sm p-1 transition-colors ${isDarkMode ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {submitMessage ? (
        <div className={`border px-3 py-2 text-[11px] leading-relaxed ${tone.error}`}>
          {submitMessage}
        </div>
      ) : null}

      {hasSubmitted ? (
        <div className={`space-y-4 border-t pt-4 ${tone.divider}`}>
          <div className={`border px-3 py-3 text-[11px] leading-relaxed ${tone.success}`}>
            Thank you. Your feedback has been sent.
          </div>
          <div className={`space-y-3 border-t pt-4 ${tone.divider}`}>
            <p className={`text-[10px] uppercase tracking-[0.12em] ${tone.caption}`}>
              Anonymous. Version {appVersion}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`min-h-9 w-full border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${tone.buttonSecondary}`}
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <form className={`space-y-4 ${tone.body}`} onSubmit={handleSubmit} noValidate>
          <Section
            number="01."
            title="Experience"
            description="How experienced are you with typographic grid systems?"
            borderClassName={tone.divider}
          >
            <p className={`text-[11px] leading-relaxed ${tone.caption}`}>
              E.g. working with grid systems according to Müller-Brockmann, baseline grids, or column grids.
            </p>
            {renderChoiceGrid({
              name: "experience",
              value: form.experience,
              options: EXPERIENCE_OPTIONS,
              onChange: (next) => setField("experience", next),
              columnsClassName: "grid-cols-3",
            })}
            <FieldError message={errors.experience} />
          </Section>

          <Section
            number="02."
            title="Usage"
            description="How often have you used Swiss Grid Generator?"
            borderClassName={tone.divider}
          >
            {renderChoiceGrid({
              name: "frequency",
              value: form.frequency,
              options: FREQUENCY_OPTIONS,
              onChange: (next) => setField("frequency", next),
              columnsClassName: "grid-cols-3",
            })}
          </Section>

          <Section
            number="03."
            title="First Impression"
            description="Think about your first 10 minutes with the tool."
            borderClassName={tone.divider}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
                  I quickly understood what the tool does.
                </p>
                {renderScaleGrid({
                  name: "understand",
                  value: form.understand,
                  values: LIKERT_VALUES,
                  columnsClassName: "grid-cols-5",
                  onChange: (next) => setField("understand", next),
                })}
                <FieldError message={errors.understand} />
              </div>

              <div className="space-y-1.5">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
                  Getting started was easy.
                </p>
                {renderScaleGrid({
                  name: "easystart",
                  value: form.easystart,
                  values: LIKERT_VALUES,
                  columnsClassName: "grid-cols-5",
                  onChange: (next) => setField("easystart", next),
                })}
                <FieldError message={errors.easystart} />
              </div>

              <div className="space-y-1.5">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
                  The interface feels intuitive.
                </p>
                {renderScaleGrid({
                  name: "intuitive",
                  value: form.intuitive,
                  values: LIKERT_VALUES,
                  columnsClassName: "grid-cols-5",
                  onChange: (next) => setField("intuitive", next),
                })}
                <FieldError message={errors.intuitive} />
              </div>

              <div className="space-y-1.5">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
                  I was able to create a meaningful grid on my first try.
                </p>
                {renderScaleGrid({
                  name: "firstresult",
                  value: form.firstresult,
                  values: LIKERT_VALUES,
                  columnsClassName: "grid-cols-5",
                  onChange: (next) => setField("firstresult", next),
                })}
                <FieldError message={errors.firstresult} />
              </div>
            </div>
          </Section>

          <Section
            number="04."
            title="Unclear or Confusing"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "first_confusion",
              label: "What was unclear or confusing in the first few minutes?",
              placeholder: "Describe the unclear part of the experience.",
            })}
          </Section>

          <Section
            number="05."
            title="What Worked"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "what_worked",
              label: "What worked particularly well?",
              placeholder: "Call out the parts that felt strong or precise.",
            })}
          </Section>

          <Section
            number="06."
            title="Problems and Friction"
            borderClassName={tone.divider}
          >
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.heading}`}>
                Did you encounter any errors or bugs?
              </label>
              {renderChoiceGrid({
                name: "bugs_found",
                value: form.bugs_found,
                options: BUG_OPTIONS,
                onChange: (next) => setField("bugs_found", next),
                columnsClassName: "grid-cols-2",
              })}
            </div>
            {form.bugs_found === "yes"
              ? renderTextarea({
                  field: "bug_description",
                  label: "If yes, what happened?",
                  placeholder: "What broke, where, and under which conditions?",
                  rows: 5,
                })
              : null}
          </Section>

          <Section
            number="07."
            title="Job To Be Done"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "job_to_be_done",
              label: "What task are you trying to solve with the tool?",
              placeholder: "Describe the editorial or layout task you came for.",
            })}
          </Section>

          <Section
            number="08."
            title="Alternatives"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "alternatives",
              label: "What alternatives are you using today?",
              placeholder: "Tools, workflows, or manual methods.",
            })}
          </Section>

          <Section
            number="09."
            title="Priority"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "top_improvement",
              label: "What is the single most important improvement we should make next?",
              placeholder: "Name the next change that matters most.",
            })}
          </Section>

          <Section
            number="10."
            title="Missing Feature"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "missing_features",
              label: "Which feature did you expect but didn't find?",
              placeholder: "Describe the missing capability.",
            })}
          </Section>

          <Section
            number="11."
            title="Recommendation"
            description="How likely are you to recommend the tool?"
            borderClassName={tone.divider}
          >
            {renderScaleGrid({
              name: "nps_score",
              value: form.nps_score,
              values: NPS_VALUES,
              columnsClassName: "grid-cols-6",
              onChange: (next) => setField("nps_score", next),
            })}
            <div className={`flex items-center justify-between text-[10px] uppercase tracking-[0.08em] ${tone.optionMuted}`}>
              <span>0 Not likely</span>
              <span>10 Very likely</span>
            </div>
            <FieldError message={errors.nps_score} />
          </Section>

          <Section
            number="12."
            title="Anything Else"
            borderClassName={tone.divider}
          >
            {renderTextarea({
              field: "anything_else",
              label: "Is there anything else you'd like to tell us?",
              placeholder: "Anything that did not fit elsewhere.",
            })}
          </Section>

          <div className={`space-y-3 border-t pt-4 ${tone.divider}`}>
            <p className={`text-[10px] uppercase tracking-[0.12em] ${tone.caption}`}>
              Anonymous. Version {appVersion}.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`min-h-9 border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${tone.buttonSecondary}`}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`min-h-9 flex-1 border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${tone.button}`}
              >
                {isSubmitting ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
