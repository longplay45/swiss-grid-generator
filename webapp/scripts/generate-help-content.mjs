import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")
const helpSourcePath = path.join(repoRoot, "HELP.md")
const outputPath = path.join(repoRoot, "webapp/lib/generated-help-content.ts")

const DIRECTIVES = new Set([
  "AVAILABLE_FONTS",
  "SHORTCUT_TABLE",
  "DOCUMENT_VARIABLE_TOKENS",
])

function parseHeading(line, level) {
  const match = line.match(new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s+\\{#([A-Za-z0-9_-]+)\\}(?:\\s+\\[(noindex)\\])?\\s*$`))
  if (!match) return null
  return {
    title: match[1].trim(),
    id: match[2],
    indexed: match[3] !== "noindex",
  }
}

function flushParagraph(buffer, blocks) {
  if (buffer.length === 0) return
  blocks.push({
    type: "paragraph",
    text: buffer.join(" ").trim(),
  })
  buffer.length = 0
}

function flushList(items, blocks) {
  if (items.length === 0) return
  blocks.push({
    type: "list",
    items: [...items],
  })
  items.length = 0
}

async function main() {
  const source = await fs.readFile(helpSourcePath, "utf8")
  const lines = source.replace(/\r\n/g, "\n").split("\n")

  /** @type {{ title: string; sections: any[] }[]} */
  const groups = []
  let currentGroup = null
  let currentSection = null
  let currentSubsection = null
  let paragraphBuffer = []
  let listBuffer = []

  const finalizeSubsection = () => {
    if (!currentSubsection) return
    flushParagraph(paragraphBuffer, currentSubsection.blocks)
    flushList(listBuffer, currentSubsection.blocks)
    currentSection?.subsections.push(currentSubsection)
    currentSubsection = null
  }

  const finalizeSection = () => {
    finalizeSubsection()
    if (!currentSection) return
    flushParagraph(paragraphBuffer, currentSection.blocks)
    flushList(listBuffer, currentSection.blocks)
    currentGroup?.sections.push(currentSection)
    currentSection = null
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "")
    if (line.startsWith("# ")) continue

    if (line.startsWith("## ")) {
      finalizeSection()
      const title = line.slice(3).trim()
      currentGroup = { title, sections: [] }
      groups.push(currentGroup)
      continue
    }

    const sectionHeading = parseHeading(line, 3)
    if (sectionHeading) {
      finalizeSection()
      if (!currentGroup) {
        throw new Error(`Section "${sectionHeading.id}" appears before any group heading`)
      }
      currentSection = {
        ...sectionHeading,
        blocks: [],
        subsections: [],
      }
      continue
    }

    const subsectionHeading = parseHeading(line, 4)
    if (subsectionHeading) {
      finalizeSubsection()
      if (!currentSection) {
        throw new Error(`Subsection "${subsectionHeading.id}" appears before a top-level section`)
      }
      flushParagraph(paragraphBuffer, currentSection.blocks)
      flushList(listBuffer, currentSection.blocks)
      currentSubsection = {
        ...subsectionHeading,
        blocks: [],
      }
      continue
    }

    const directiveMatch = line.match(/^\{\{([A-Z0-9_]+)\}\}$/)
    if (directiveMatch) {
      const name = directiveMatch[1]
      if (!DIRECTIVES.has(name)) {
        throw new Error(`Unknown help directive "{{${name}}}"`)
      }
      const target = currentSubsection ?? currentSection
      if (!target) {
        throw new Error(`Directive "{{${name}}}" appears outside any section`)
      }
      flushParagraph(paragraphBuffer, target.blocks)
      flushList(listBuffer, target.blocks)
      target.blocks.push({
        type: "directive",
        name,
      })
      continue
    }

    const listMatch = line.match(/^- (.+)$/)
    if (listMatch) {
      const target = currentSubsection ?? currentSection
      if (!target) {
        if (!currentGroup) continue
        throw new Error(`List item "${line}" appears outside any section`)
      }
      flushParagraph(paragraphBuffer, target.blocks)
      listBuffer.push(listMatch[1].trim())
      continue
    }

    if (/^\s{2,}\S/.test(rawLine) && listBuffer.length > 0) {
      listBuffer[listBuffer.length - 1] = `${listBuffer[listBuffer.length - 1]} ${rawLine.trim()}`
      continue
    }

    if (line.trim() === "") {
      const target = currentSubsection ?? currentSection
      if (target) {
        flushParagraph(paragraphBuffer, target.blocks)
        flushList(listBuffer, target.blocks)
      }
      continue
    }

    const target = currentSubsection ?? currentSection
    if (!target) {
      if (!currentGroup) continue
      throw new Error(`Paragraph "${line}" appears outside any section`)
    }
    flushList(listBuffer, target.blocks)
    paragraphBuffer.push(line.trim())
  }

  finalizeSection()

  const allSections = []
  const subsectionItems = []
  const seenIds = new Set()

  for (const group of groups) {
    for (const section of group.sections) {
      if (seenIds.has(section.id)) throw new Error(`Duplicate help section id "${section.id}"`)
      seenIds.add(section.id)
      allSections.push({ id: section.id, label: section.title })
      for (const subsection of section.subsections) {
        if (seenIds.has(subsection.id)) throw new Error(`Duplicate help section id "${subsection.id}"`)
        seenIds.add(subsection.id)
        subsectionItems.push({
          id: subsection.id,
          label: `${section.title} / ${subsection.title.replace(/\s+Section$/, "")}`,
        })
      }
    }
  }

  const helpIndexGroups = groups
    .map((group) => ({
      title: group.title,
      items: group.sections
        .filter((section) => section.indexed)
        .map((section) => ({
          id: section.id,
          label: section.title,
        })),
    }))
    .filter((group) => group.items.length > 0)

  const output = `/* eslint-disable */
// This file is generated by webapp/scripts/generate-help-content.mjs from HELP.md.
// Do not edit this file directly.

export type HelpDirectiveName = "AVAILABLE_FONTS" | "SHORTCUT_TABLE" | "DOCUMENT_VARIABLE_TOKENS"

export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "directive"; name: HelpDirectiveName }

export type HelpSubsection = {
  id: string
  title: string
  indexed: boolean
  blocks: HelpBlock[]
}

export type HelpSection = {
  id: string
  title: string
  indexed: boolean
  blocks: HelpBlock[]
  subsections: HelpSubsection[]
}

export type HelpGroup = {
  title: string
  sections: HelpSection[]
}

export const HELP_CONTENT_GROUPS = ${JSON.stringify(groups, null, 2)} as const satisfies readonly HelpGroup[]

export const HELP_INDEX_GROUPS = ${JSON.stringify(helpIndexGroups, null, 2)} as const

export const ALL_HELP_INDEX_ITEMS = ${JSON.stringify(allSections, null, 2)} as const

export const EDITOR_HELP_SUBSECTION_ITEMS = ${JSON.stringify(subsectionItems, null, 2)} as const

export const ALL_HELP_SECTION_ITEMS = [
  ...ALL_HELP_INDEX_ITEMS,
  ...EDITOR_HELP_SUBSECTION_ITEMS,
] as const

export type HelpSectionId = (typeof ALL_HELP_SECTION_ITEMS)[number]["id"]
`

  await fs.writeFile(outputPath, output)
  process.stdout.write(`Generated help content from ${path.relative(repoRoot, helpSourcePath)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
