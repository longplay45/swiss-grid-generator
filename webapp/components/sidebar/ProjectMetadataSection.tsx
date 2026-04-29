"use client"

import { useEffect, useState } from "react"

import { SectionHeaderRow } from "@/components/ui/section-header-row"

type Props = {
  projectDescription: string
  projectAuthor: string
  onProjectDescriptionChange: (nextDescription: string) => void
  onProjectAuthorChange: (nextAuthor: string) => void
  isDarkMode?: boolean
}

export function ProjectMetadataSection({
  projectDescription,
  projectAuthor,
  onProjectDescriptionChange,
  onProjectAuthorChange,
  isDarkMode = false,
}: Props) {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingAuthor, setIsEditingAuthor] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(projectDescription)
  const [authorDraft, setAuthorDraft] = useState(projectAuthor)

  useEffect(() => {
    if (isEditingDescription) return
    setDescriptionDraft(projectDescription)
  }, [isEditingDescription, projectDescription])

  useEffect(() => {
    if (isEditingAuthor) return
    setAuthorDraft(projectAuthor)
  }, [isEditingAuthor, projectAuthor])

  const tone = isDarkMode
    ? {
        input: "border-[#313A47] bg-[#232A35] text-[#F4F6F8] placeholder:text-[#8D98AA]",
      }
    : {
        input: "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400",
      }

  const commitDescription = () => {
    const trimmedDescription = descriptionDraft.trim()
    if (trimmedDescription !== projectDescription.trim()) {
      onProjectDescriptionChange(trimmedDescription)
    }
    setIsEditingDescription(false)
  }

  const commitAuthor = () => {
    const trimmedAuthor = authorDraft.trim()
    if (trimmedAuthor !== projectAuthor.trim()) {
      onProjectAuthorChange(trimmedAuthor)
    }
    setIsEditingAuthor(false)
  }

  const resetDescription = () => {
    setDescriptionDraft(projectDescription)
    setIsEditingDescription(false)
  }

  const resetAuthor = () => {
    setAuthorDraft(projectAuthor)
    setIsEditingAuthor(false)
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="space-y-1.5">
        <SectionHeaderRow label="Description" />
        <textarea
          value={descriptionDraft}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          onFocus={() => setIsEditingDescription(true)}
          onBlur={commitDescription}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              resetDescription()
            }
          }}
          className={`min-h-[72px] w-full resize-none rounded-sm border px-2 py-1.5 text-[12px] leading-[1.45] outline-none ${tone.input}`}
          placeholder="Short description"
        />
      </div>
      <div className="space-y-1.5">
        <SectionHeaderRow label="Author" />
        <input
          type="text"
          value={authorDraft}
          onChange={(event) => setAuthorDraft(event.target.value)}
          onFocus={() => setIsEditingAuthor(true)}
          onBlur={commitAuthor}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitAuthor()
            }
            if (event.key === "Escape") {
              event.preventDefault()
              resetAuthor()
            }
          }}
          className={`w-full rounded-sm border px-2 py-1 text-[12px] outline-none ${tone.input}`}
          placeholder="Author name"
        />
      </div>
    </div>
  )
}
