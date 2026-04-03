import type jsPDF from "jspdf"

export type PdfExportColorMode = "rgb" | "cmyk"
export type PdfOutputIntentProfileId = "srgb" | "coated-fogra39"

type PdfOutputIntentProfile = {
  assetPath: string
  channels: 3 | 4
  alternateDevice: "/DeviceRGB" | "/DeviceCMYK"
  outputConditionIdentifier: string
  outputCondition: string
  info: string
  registryName: string
}

type PdfInternalEventHandler = (...args: unknown[]) => void

type PdfWithInternals = jsPDF & {
  internal: {
    collections: Record<string, unknown>
    events: {
      subscribe: (topic: string, handler: PdfInternalEventHandler) => string | undefined
    }
    newObjectDeferred: () => number
    newObjectDeferredBegin: (oid: number, doOutput?: boolean) => number
    putStream: (options: {
      data: string
      objectId: number
      additionalKeyValues?: Array<{ key: string; value: string | number }>
      alreadyAppliedFilters?: string[]
      filters?: boolean | string[]
    }) => void
    write: (...chunks: Array<string | number>) => void
  }
}

type OutputIntentState = {
  profileObjectId: number | null
  profile: PdfOutputIntentProfile
  binaryString: string
}

const OUTPUT_INTENT_NAMESPACE = "__swissGridPdfOutputIntent"

const OUTPUT_INTENT_PROFILES: Record<PdfOutputIntentProfileId, PdfOutputIntentProfile> = {
  srgb: {
    assetPath: "/pdf-profiles/srgb-iec61966-2-1.icc",
    channels: 3,
    alternateDevice: "/DeviceRGB",
    outputConditionIdentifier: "sRGB IEC61966-2.1",
    outputCondition: "sRGB IEC61966-2.1",
    info: "sRGB IEC61966-2.1",
    registryName: "https://www.color.org",
  },
  "coated-fogra39": {
    assetPath: "/pdf-profiles/coated-fogra39.icc",
    channels: 4,
    alternateDevice: "/DeviceCMYK",
    outputConditionIdentifier: "FOGRA39",
    outputCondition: "Coated FOGRA39 (ISO 12647-2:2004)",
    info: "Coated FOGRA39 (ISO 12647-2:2004)",
    registryName: "https://www.color.org",
  },
}

const profileBytesCache = new Map<string, Promise<Uint8Array>>()

function escapePdfLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}

function toBinaryString(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let result = ""
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    result += String.fromCharCode(...chunk)
  }
  return result
}

async function fetchProfileBytes(assetPath: string): Promise<Uint8Array> {
  const cached = profileBytesCache.get(assetPath)
  if (cached) return cached

  const request = fetch(assetPath, { cache: "force-cache" }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load ICC profile "${assetPath}" (${response.status})`)
    }
    return new Uint8Array(await response.arrayBuffer())
  })

  profileBytesCache.set(assetPath, request)
  return request
}

function ensureOutputIntentHooks(pdf: PdfWithInternals): OutputIntentState {
  const existing = pdf.internal.collections[OUTPUT_INTENT_NAMESPACE]
  if (existing) return existing as OutputIntentState

  const state: OutputIntentState = {
    profileObjectId: null,
    profile: OUTPUT_INTENT_PROFILES.srgb,
    binaryString: "",
  }

  pdf.internal.collections[OUTPUT_INTENT_NAMESPACE] = state

  pdf.internal.events.subscribe("postPutResources", function (this: PdfWithInternals) {
    const current = this.internal.collections[OUTPUT_INTENT_NAMESPACE] as OutputIntentState | undefined
    if (!current?.binaryString) return

    const profileObjectId = current.profileObjectId ?? this.internal.newObjectDeferred()
    current.profileObjectId = profileObjectId
    this.internal.newObjectDeferredBegin(profileObjectId, true)
    this.internal.putStream({
      objectId: profileObjectId,
      data: current.binaryString,
      additionalKeyValues: [
        { key: "N", value: current.profile.channels },
        { key: "Alternate", value: current.profile.alternateDevice },
      ],
    })
    this.internal.write("endobj")
  })

  pdf.internal.events.subscribe("putCatalog", function (this: PdfWithInternals) {
    const current = this.internal.collections[OUTPUT_INTENT_NAMESPACE] as OutputIntentState | undefined
    if (!current?.binaryString || current.profileObjectId === null) return

    this.internal.write("/OutputIntents [<<")
    this.internal.write("/Type /OutputIntent")
    this.internal.write("/S /GTS_PDFX")
    this.internal.write(`/OutputConditionIdentifier (${escapePdfLiteral(current.profile.outputConditionIdentifier)})`)
    this.internal.write(`/OutputCondition (${escapePdfLiteral(current.profile.outputCondition)})`)
    this.internal.write(`/RegistryName (${escapePdfLiteral(current.profile.registryName)})`)
    this.internal.write(`/Info (${escapePdfLiteral(current.profile.info)})`)
    this.internal.write(`/DestOutputProfile ${current.profileObjectId} 0 R`)
    this.internal.write(">>]")
  })

  return state
}

export async function attachPdfOutputIntent(pdf: jsPDF, profileId: PdfOutputIntentProfileId): Promise<void> {
  const profile = OUTPUT_INTENT_PROFILES[profileId]
  const bytes = await fetchProfileBytes(profile.assetPath)
  const state = ensureOutputIntentHooks(pdf as PdfWithInternals)
  state.profile = profile
  state.binaryString = toBinaryString(bytes)
}
