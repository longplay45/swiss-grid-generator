import { X } from "lucide-react"

import { SECTION_HEADLINE_CLASSNAME } from "@/lib/ui-section-headline"

type Props = {
  isDarkMode?: boolean
  onClose: () => void
}

export function ImprintPanel({ isDarkMode = false, onClose }: Props) {
  const tone = isDarkMode
    ? {
        body: "text-[#A8B1BF]",
        emphasis: "text-[#F4F6F8]",
        caption: "text-[#8D98AA]",
        divider: "border-[#313A47]",
        action: "border-[#313A47] bg-[#232A35] text-[#A8B1BF] hover:bg-[#1D232D] hover:text-[#F4F6F8]",
        link: "text-blue-400 hover:underline",
      }
    : {
        body: "text-gray-600",
        emphasis: "text-gray-900",
        caption: "text-gray-400",
        divider: "border-gray-200",
        action: "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900",
        link: "text-blue-600 hover:underline",
      }

  return (
    <div className="space-y-4">
      <div className="rounded-md py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>I M P R I N T</h3>
          </div>
          <button
            type="button"
            aria-label="Close imprint panel"
            onClick={onClose}
            className={`mt-[2px] inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${tone.action}`}
          >
            <X className="h-2 w-2" />
          </button>
        </div>
      </div>

      <section className="space-y-2">
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Tool</h4>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <span className={`font-medium ${tone.emphasis}`}>Swiss Grid Generator</span>
          <br />
          A web-based tool for generating modular typographic grids based on Josef
          Muller-Brockmann&apos;s &ldquo;Grid Systems in Graphic Design&rdquo; (1981).
        </p>
      </section>

      <section className={`space-y-2 border-t pt-3 ${tone.divider}`}>
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Developer</h4>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <a href="https://lp45.net" className={tone.link}>
            lp45.net
          </a>
        </p>
      </section>

      <section className={`space-y-2 border-t pt-3 ${tone.divider}`}>
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>License</h4>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Copyleft &amp; -right 2026. All rights reserved.
        </p>
      </section>

      <section className={`space-y-2 border-t pt-3 ${tone.divider}`}>
        <h4 className={`${SECTION_HEADLINE_CLASSNAME} mb-0`}>Contact</h4>
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <a href="mailto:hello@swiss-grid-generator.com" className={tone.link}>
            hello@swiss-grid-generator.com
          </a>
        </p>
      </section>

      <section className={`border-t pt-3 ${tone.divider}`}>
        <p className={`text-[11px] leading-relaxed ${tone.caption}`}>
          This tool is inspired by the principles of Swiss Design and the International Typographic
          Style. The generated grids are intended for educational and design purposes.
        </p>
      </section>
    </div>
  )
}
