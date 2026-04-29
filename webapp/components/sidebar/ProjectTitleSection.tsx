"use client"

import { ChevronUp, Pencil } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ProjectMetadataSection } from "@/components/sidebar/ProjectMetadataSection"
import { SectionHeaderRow } from "@/components/ui/section-header-row"

type Props = {
  projectTitle: string
  projectDescription: string
  projectAuthor: string
  onProjectTitleChange: (nextTitle: string) => void
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  isDarkMode?: boolean
}

export function ProjectTitleSection({
  projectTitle,
  projectDescription,
  projectAuthor,
  onProjectTitleChange,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  isDarkMode = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
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
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:text-[#F4F6F8]",
        input: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] placeholder:text-[#8D98AA]",
      }
    : {
        body: "text-gray-600",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:text-gray-900",
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
    <div className="mt-4">
      <SectionHeaderRow
        label="Title"
        actionIcon={(
          <ChevronUp
            className={`h-2 w-2 transition-transform ${isExpanded ? "rotate-180" : "rotate-90"}`}
            aria-hidden="true"
          />
        )}
        actionLabel={isExpanded ? "Collapse title metadata" : "Expand title metadata"}
        actionClassName={tone.action}
        onActionClick={() => setIsExpanded((current) => !current)}
      />
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
            <div className={`truncate text-xs ${tone.body}`}>{visibleProjectTitle}</div>
          )}
        </div>
        <button
          type="button"
          aria-label="Rename project"
          className={`mt-[2px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${tone.action}`}
          onClick={beginProjectTitleEdit}
        >
          <Pencil className="h-2 w-2" />
        </button>
      </div>
      {isExpanded ? (
        <ProjectMetadataSection
          projectDescription={projectDescription}
          projectAuthor={projectAuthor}
          onProjectDescriptionChange={onProjectDescriptionChange}
          onProjectAuthorChange={onProjectAuthorChange}
          isDarkMode={isDarkMode}
        />
      ) : null}
    </div>
  )
}
