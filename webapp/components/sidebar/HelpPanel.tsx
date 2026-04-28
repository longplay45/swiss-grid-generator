import { useEffect } from "react"
import { ChevronUp, X } from "lucide-react"
import type { ReactNode } from "react"

import { USER_FONT_DEFINITIONS } from "@/lib/config/fonts"
import { DOCUMENT_VARIABLE_DEFINITIONS } from "@/lib/document-variable-definitions"
import {
  HELP_CONTENT_GROUPS,
  type HelpBlock,
  type HelpDirectiveName,
  type HelpSection,
  type HelpSubsection,
} from "@/lib/generated-help-content"
import { HELP_INDEX_GROUPS } from "@/lib/help-registry"
import type { HelpSectionId } from "@/lib/help-registry"
import { PREVIEW_HEADER_SHORTCUTS } from "@/lib/preview-header-shortcuts"
import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
  activeSectionId?: HelpSectionId | null
}

type SectionHeadingProps = {
  as?: "h4" | "h5"
  className: string
  jumpButtonClassName: string
  labelClassName?: string
  children: ReactNode
}

type Tone = {
  heading: string
  body: string
  divider: string
  emphasis: string
  caption: string
  indexLink: string
  jumpButton: string
  inlineCode: string
}

const GOOGLE_FONTS_SPECIMEN_BASE_URL = "https://fonts.google.com/specimen/"
const FONT_CATEGORY_ORDER = ["Sans-Serif", "Serif", "Display"] as const
const FONT_CATEGORY_LABEL: Record<(typeof FONT_CATEGORY_ORDER)[number], string> = {
  "Sans-Serif": "Sans-Serif",
  Serif: "Serif",
  Display: "Poster",
}
const AVAILABLE_FONT_GROUPS = FONT_CATEGORY_ORDER.map((category) => ({
  category,
  label: FONT_CATEGORY_LABEL[category],
  fonts: USER_FONT_DEFINITIONS.filter((definition) => definition.category === category),
}))

function getGoogleFontsSpecimenUrl(fontLabel: string): string {
  return `${GOOGLE_FONTS_SPECIMEN_BASE_URL}${fontLabel.replace(/\s+/g, "+")}`
}

function SectionHeading({
  as = "h4",
  className,
  jumpButtonClassName,
  labelClassName,
  children,
}: SectionHeadingProps) {
  const Tag = as
  return (
    <Tag className={`flex items-start justify-between gap-2 ${className}`}>
      <span className={`min-w-0 flex-1 ${labelClassName}`}>{children}</span>
      <button
        type="button"
        aria-label="Jump to top"
        title="Jump to top"
        onClick={() => {
          document.getElementById("help-index")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        className={`mt-[2px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${jumpButtonClassName}`}
      >
        <ChevronUp className="h-2 w-2" />
      </button>
    </Tag>
  )
}

function renderDocumentVariableTokens(tone: Tone, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  DOCUMENT_VARIABLE_DEFINITIONS.forEach(({ token }, index) => {
    if (index > 0) {
      nodes.push(<span key={`${keyPrefix}-sep-${token}`}>{", "}</span>)
    }
    nodes.push(
      <code key={`${keyPrefix}-${token}`} className={tone.inlineCode}>
        {token}
      </code>,
    )
  })
  return nodes
}

function renderInlineContent(text: string, tone: Tone, keyPrefix: string): ReactNode[] {
  const tokenPattern = /(\{\{DOCUMENT_VARIABLE_TOKENS\}\}|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  return text.split(tokenPattern).flatMap((segment, index) => {
    if (!segment) return []
    const key = `${keyPrefix}-${index}`
    if (segment === "{{DOCUMENT_VARIABLE_TOKENS}}") {
      return renderDocumentVariableTokens(tone, key)
    }
    if (segment.startsWith("`") && segment.endsWith("`")) {
      return (
        <code key={key} className={tone.inlineCode}>
          {segment.slice(1, -1)}
        </code>
      )
    }
    const linkMatch = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className={tone.indexLink}
        >
          {linkMatch[1]}
        </a>
      )
    }
    return <span key={key}>{segment}</span>
  })
}

function renderAvailableFonts(tone: Tone) {
  return (
    <div className="space-y-3">
      {AVAILABLE_FONT_GROUPS.map((group) => (
        <div key={group.category} className="space-y-1">
          <p className={`text-xs font-semibold ${tone.heading}`}>{group.label}</p>
          <ul className={`space-y-1 text-xs list-disc pl-4 ${tone.body}`}>
            {group.fonts.map((font) => (
              <li key={font.value}>
                <a
                  href={getGoogleFontsSpecimenUrl(font.label)}
                  target="_blank"
                  rel="noreferrer"
                  className={tone.indexLink}
                >
                  {font.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function renderShortcutTable(tone: Tone) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-xs ${tone.body}`}>
        <thead>
          <tr className={`border-b ${tone.divider}`}>
            <th className={`py-1 text-left font-semibold ${tone.heading}`}>Action</th>
            <th className={`py-1 text-left font-semibold ${tone.heading}`}>Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {PREVIEW_HEADER_SHORTCUTS.map((shortcut) => (
            <tr key={shortcut.id} className={`border-b last:border-0 ${tone.divider}`}>
              <td className="py-1 align-top">{shortcut.description}</td>
              <td className={`py-1 pr-3 align-top ${tone.emphasis}`}>{shortcut.combo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderDirective(name: HelpDirectiveName, tone: Tone) {
  switch (name) {
    case "AVAILABLE_FONTS":
      return renderAvailableFonts(tone)
    case "SHORTCUT_TABLE":
      return renderShortcutTable(tone)
    case "DOCUMENT_VARIABLE_TOKENS":
      return (
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          {renderDocumentVariableTokens(tone, "directive-document-variable-tokens")}
        </p>
      )
    default:
      return null
  }
}

function renderHelpBlock(block: HelpBlock, tone: Tone, key: string) {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={key} className={`text-xs leading-relaxed ${tone.body}`}>
          {renderInlineContent(block.text, tone, key)}
        </p>
      )
    case "list":
      return (
        <ul key={key} className={`space-y-1.5 text-xs list-disc pl-4 ${tone.body}`}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>
              {renderInlineContent(item, tone, `${key}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      )
    case "directive":
      return <div key={key}>{renderDirective(block.name, tone)}</div>
    default:
      return null
  }
}

function renderSubsection(subsection: HelpSubsection, tone: Tone) {
  return (
    <div key={subsection.id} id={subsection.id} className="space-y-1 pt-1">
      <h5 className={`text-xs font-semibold uppercase tracking-[0.08em] ${tone.caption}`}>{subsection.title}</h5>
      {subsection.blocks.map((block, index) => renderHelpBlock(block, tone, `${subsection.id}-${index}`))}
    </div>
  )
}

function renderSection(section: HelpSection, tone: Tone) {
  return (
    <section key={section.id} id={section.id} className="space-y-2">
      <SectionHeading
        className="text-[11px] font-semibold uppercase tracking-[0.08em]"
        jumpButtonClassName={tone.jumpButton}
        labelClassName={SECTION_HEADLINE_CLASSNAME}
      >
        {section.title}
      </SectionHeading>
      {section.blocks.map((block, index) => renderHelpBlock(block, tone, `${section.id}-${index}`))}
      {section.subsections.map((subsection) => renderSubsection(subsection, tone))}
    </section>
  )
}

export function HelpPanel({ isDarkMode = false, onClose, activeSectionId }: Props) {
  useEffect(() => {
    if (!activeSectionId) return
    const target = document.getElementById(activeSectionId)
    if (!target) return
    const scrollRoot = target.closest("[data-help-scroll-root='true']") as HTMLElement | null
    if (!scrollRoot) return

    const topGapPx = 4
    const rootRect = scrollRoot.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const deltaToTop = targetRect.top - rootRect.top
    const nextTop = scrollRoot.scrollTop + deltaToTop - topGapPx
    window.requestAnimationFrame(() => {
      scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" })
    })
  }, [activeSectionId])

  const tone: Tone = isDarkMode
    ? {
        heading: "text-[#F4F6F8]",
        body: "text-[#A8B1BF]",
        divider: "border-[#313A47]",
        emphasis: "text-[#F4F6F8] font-medium",
        caption: "text-[#8D98AA]",
        indexLink: "text-blue-400 hover:underline",
        jumpButton: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        inlineCode: "rounded-sm bg-black/5 px-1 py-[1px] font-mono text-[11px] text-[#F4F6F8] dark:bg-white/10",
      }
    : {
        heading: "text-gray-900",
        body: "text-gray-600",
        divider: "border-gray-200",
        emphasis: "text-gray-700 font-medium",
        caption: "text-gray-400",
        indexLink: "text-blue-600 hover:underline",
        jumpButton: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        inlineCode: "rounded-sm bg-gray-100 px-1 py-[1px] font-mono text-[11px] text-gray-900",
      }

  const renderedSections: HelpSection[] = []
  for (const group of HELP_CONTENT_GROUPS) {
    for (const section of group.sections) {
      renderedSections.push(section as HelpSection)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>H E L P</h3>
          </div>
          <button
            type="button"
            aria-label="Close help panel"
            onClick={onClose}
            className={`mt-[2px] inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${tone.jumpButton}`}
          >
            <X className="h-2 w-2" />
          </button>
        </div>
      </div>

      <div id="help-index" className="space-y-2">
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Index</h4>
        {HELP_INDEX_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className={groupIndex > 0 ? "mt-2" : ""}>
            <h5 className={`${SECTION_HEADLINE_CLASSNAME} mb-1`}>{group.title}</h5>
            <ul className={`space-y-1 text-xs list-disc pl-4 ${tone.body}`}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className={tone.indexLink}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {renderedSections.map((section) => renderSection(section, tone))}
    </div>
  )
}
