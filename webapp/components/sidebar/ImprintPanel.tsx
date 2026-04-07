import { X } from "lucide-react"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
}

export function ImprintPanel({ isDarkMode = false, onClose }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>Imprint</h3>
        <button
          type="button"
          aria-label="Close imprint panel"
          onClick={onClose}
          className={`rounded-sm p-1 transition-colors ${isDarkMode ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={`space-y-3 text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
        <p>
          <strong>Swiss Grid Generator</strong>
          <br />A web-based tool for generating modular typographic grids based on Josef
          Müller-Brockmann&apos;s &ldquo;Grid Systems in Graphic Design&rdquo; (1981).
        </p>
        <p>
          <strong>Developer:</strong>
          <br />
          <a href="https://lp45.net" className={isDarkMode ? "text-blue-400 hover:underline" : "text-blue-600 hover:underline"}>
            lp45.net
          </a>
        </p>
        <p>
          <strong>License:</strong>
          <br />
          Copyleft &amp; -right 2026. All rights reserved.
        </p>
        <p>
          <strong>Contact:</strong>
          <br />
          <a
            href="mailto:hello@swiss-grid-generator.com"
            className={isDarkMode ? "text-blue-400 hover:underline" : "text-blue-600 hover:underline"}
          >
            hello@swiss-grid-generator.com
          </a>
        </p>
        <p className={`pt-2 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
          This tool is inspired by the principles of Swiss Design and the International Typographic
          Style. The generated grids are intended for educational and design purposes.
        </p>
      </div>
    </div>
  )
}
