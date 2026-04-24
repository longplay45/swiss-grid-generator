import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const WEBAPP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO_ROOT = path.resolve(WEBAPP_ROOT, "..")
const MANUAL_PATH = path.join(REPO_ROOT, "MANUAL.md")
const SECTION_TEMPLATE_PATH = path.join(WEBAPP_ROOT, "lib", "presets", "templates", "manual-section-page-template.json")
const OUTPUT_PATH = path.join(WEBAPP_ROOT, "lib", "presets", "data", "100 Swiss Grid Generator Manual.json")

function normalizeText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\r/g, "")
    .trim()
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function formatSectionTitle(rawTitle) {
  const match = rawTitle.match(/^(\d+)\.\s+(.+)$/)
  if (!match) {
    return {
      text: rawTitle,
      numberTokenLength: 0,
      pageName: rawTitle,
    }
  }
  const [, number, label] = match
  return {
    text: `${number}.\n${label}`,
    numberTokenLength: `${number}.`.length,
    pageName: label,
  }
}

function formatTitlePageTitle(rawTitle) {
  if (rawTitle.trim() === "Swiss Grid Generator") {
    return {
      text: "Swiss \nGrid\nGenerator",
      formatRuns: [{ start: 7, end: 11, fontWeight: 600 }],
      pageName: "Title",
    }
  }
  return {
    text: rawTitle,
    formatRuns: [],
    pageName: "Title",
  }
}

function makePageId(index) {
  return `page-manual-${String(index).padStart(2, "0")}`
}

function parseManualMarkdown(source) {
  const lines = source.split("\n")
  const title = lines[0]?.replace(/^#\s+/, "").trim() || "Swiss Grid Generator Manual"

  let cursor = 1
  while (cursor < lines.length && lines[cursor].trim() === "") cursor += 1

  const sections = []
  let current = null
  let bodyParagraphs = []
  let paragraphBuffer = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    bodyParagraphs.push(normalizeText(paragraphBuffer.join(" ").trim()))
    paragraphBuffer = []
  }

  const finalizeSection = () => {
    flushParagraph()
    if (!current) return
    current.body = bodyParagraphs.join("\n\n").trim()
    sections.push(current)
    current = null
    bodyParagraphs = []
    paragraphBuffer = []
  }

  for (; cursor < lines.length; cursor += 1) {
    const raw = lines[cursor]
    if (raw.startsWith("## ")) {
      finalizeSection()
      current = {
        title: raw.replace(/^##\s+/, "").trim(),
        subheadline: "",
        body: "",
      }
      continue
    }
    if (!current) continue
    if (raw.startsWith("### ")) {
      flushParagraph()
      current.subheadline = normalizeText(raw.replace(/^###\s+/, "").trim())
      continue
    }
    const line = raw.trim()
    if (line === "") {
      flushParagraph()
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      paragraphBuffer.push(line.replace(/^[-*]\s+/, ""))
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      paragraphBuffer.push(line.replace(/^\d+\.\s+/, ""))
      continue
    }
    paragraphBuffer.push(line)
  }

  finalizeSection()

  for (const section of sections) {
    if (section.body.length > 700) {
      throw new Error(`${section.title} copy exceeds 700 characters (${section.body.length})`)
    }
  }

  return { title, sections }
}

async function main() {
  const [manualMd, sectionTemplateSource] = await Promise.all([
    fs.readFile(MANUAL_PATH, "utf8"),
    fs.readFile(SECTION_TEMPLATE_PATH, "utf8"),
  ])

  const sectionTemplate = JSON.parse(sectionTemplateSource)
  const { title, sections } = parseManualMarkdown(manualMd)

  const pages = []

  sections.forEach((section, index) => {
    const page = deepClone(sectionTemplate)
    const isTitlePage = index === 0 && !/^\d+\.\s+/.test(section.title)
    const titleInfo = isTitlePage ? formatTitlePageTitle(section.title) : formatSectionTitle(section.title)
    page.id = makePageId(index)
    page.name = titleInfo.pageName
    page.previewLayout.textContent["cover-title"] = titleInfo.text
    page.previewLayout.textContent["cover-step-1"] = "Swiss Grid Generator - User Manual - Page <%page%> of <%pages%>"
    page.previewLayout.textContent["paragraph-94aa932b-41cb-4033-b800-0353c27e83fd"] = section.subheadline
    page.previewLayout.textContent["paragraph-1094c876-1831-4124-a765-f078fb4a84f9"] = ""
    page.previewLayout.textContent["paragraph-0c92763f-e2c5-4f48-8180-5a04744d774b"] = ""
    page.previewLayout.textContent["paragraph-590e9b2e-f0a9-427a-95a8-145fd270e1b1"] = section.body

    page.previewLayout.blockTextFormatRuns = page.previewLayout.blockTextFormatRuns ?? {}
    if (isTitlePage) {
      page.previewLayout.blockTextFormatRuns["cover-title"] = titleInfo.formatRuns
    } else {
      page.previewLayout.blockTextFormatRuns["cover-title"] = titleInfo.numberTokenLength > 0
        ? [{ start: 0, end: titleInfo.numberTokenLength, fontWeight: 600 }]
        : []
    }

    pages.push(page)
  })

  const payload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    title,
    description: "Swiss Grid Generator Software Manual",
    author: "Swiss Grid Generator",
    createdAt: "2026-04-07T12:00:00.000Z",
    activePageId: pages[0]?.id ?? makePageId(0),
    pages,
  }

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`Generated manual preset (${pages.length} pages).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
