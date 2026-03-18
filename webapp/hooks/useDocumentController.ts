import { useCallback, useState } from "react"
import type { ChangeEvent } from "react"

import type { LayoutPreset } from "@/lib/presets"
import {
  EMPTY_DOCUMENT_METADATA,
  parseLoadedDocument,
  presetToLoadedDocument,
  type DocumentMetadata,
  type LoadedDocument,
} from "@/lib/document-session"

type Args<Layout> = {
  defaultMetadata?: DocumentMetadata
  onApplyDocument: (document: LoadedDocument<Layout>) => void
  onLoadFailed: (error: unknown) => void
}

export function useDocumentController<Layout>({
  defaultMetadata = EMPTY_DOCUMENT_METADATA,
  onApplyDocument,
  onLoadFailed,
}: Args<Layout>) {
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>(defaultMetadata)

  const applyLoadedDocument = useCallback((document: LoadedDocument<Layout>) => {
    setDocumentMetadata(document.metadata)
    onApplyDocument(document)
  }, [onApplyDocument])

  const loadDocumentFromInput = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    const finish = () => {
      event.target.value = ""
    }

    reader.onload = () => {
      try {
        applyLoadedDocument(parseLoadedDocument<Layout>(JSON.parse(String(reader.result))))
      } catch (error) {
        console.error(error)
        onLoadFailed(error)
      } finally {
        finish()
      }
    }

    reader.onerror = () => {
      const error = reader.error ?? new Error("Could not read layout JSON.")
      console.error(error)
      onLoadFailed(error)
      finish()
    }

    reader.readAsText(file)
  }, [applyLoadedDocument, onLoadFailed])

  const loadPresetDocument = useCallback((preset: LayoutPreset) => {
    applyLoadedDocument(presetToLoadedDocument<Layout>(preset))
  }, [applyLoadedDocument])

  return {
    documentMetadata,
    setDocumentMetadata,
    loadDocumentFromInput,
    loadPresetDocument,
  }
}
