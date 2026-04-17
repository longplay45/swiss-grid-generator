"use client"

import { Pencil } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type Props = {
  projectTitle: string
  pageCount: number
  onProjectTitleChange: (nextTitle: string) => void
  isDarkMode?: boolean
}

export function ProjectTitleSection({
  projectTitle,
  pageCount,
  onProjectTitleChange,
  isDarkMode = false,
}: Props) {
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false)
  const [projectTitleDraft, setProjectTitleDraft] = useState(projectTitle)
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isEditingProjectTitle) return
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    })
  }, [isEditingProjectTitle])

  useEffect(() => {
    if (isEditingProjectTitle) return
    setProjectTitleDraft(projectTitle)
  }, [isEditingProjectTitle, projectTitle])

  const visibleProjectTitle = projectTitle.trim() || "Untitled Project"
  const tone = isDarkMode
    ? {
        body: "text-[#8D98AA]",
        close: "text-[#A8B1BF] hover:bg-[#232A35] hover:text-[#F4F6F8]",
        input: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] placeholder:text-[#8D98AA]",
      }
    : {
        body: "text-gray-600",
        close: "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
        input: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
      }

  const beginProjectTitleEdit = () => {
    setProjectTitleDraft(projectTitle)
    setIsEditingProjectTitle(true)
  }

  const cancelProjectTitleEdit = () => {
    setIsEditingProjectTitle(false)
    setProjectTitleDraft(projectTitle)
  }

  const commitProjectTitle = () => {
    const trimmedTitle = projectTitleDraft.trim()
    if (trimmedTitle.length > 0 && trimmedTitle !== projectTitle.trim()) {
      onProjectTitleChange(trimmedTitle)
    }
    setIsEditingProjectTitle(false)
  }

  return (
    <div className="mt-4 flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className={SECTION_HEADLINE_CLASSNAME}>Name</div>
        {isEditingProjectTitle ? (
          <input
            ref={titleInputRef}
            value={projectTitleDraft}
            onChange={(event) => setProjectTitleDraft(event.target.value)}
            onBlur={commitProjectTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commitProjectTitle()
              }
              if (event.key === "Escape") {
                event.preventDefault()
                cancelProjectTitleEdit()
              }
            }}
            className={`w-full rounded-sm border px-2 py-1 text-[12px] outline-none ${tone.input}`}
          />
        ) : (
          <div className={`truncate text-xs ${tone.body}`}>
            {visibleProjectTitle} | {pageCount} {pageCount === 1 ? "page" : "pages"}
          </div>
        )}
      </div>
      <button
        type="button"
        aria-label="Rename project"
        className={`rounded-sm p-1 transition-colors ${tone.close}`}
        onClick={beginProjectTitleEdit}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
