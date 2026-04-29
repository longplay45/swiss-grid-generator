import { X } from "lucide-react"

import { SectionHeaderRow } from "@/components/ui/section-header-row"

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
        <SectionHeaderRow
          label="I M P R I N T"
          actionIcon={<X className="h-2 w-2" />}
          actionLabel="Close imprint panel"
          actionClassName={tone.action}
          onActionClick={onClose}
        />
      </div>

      <section className="space-y-2">
        <SectionHeaderRow label="Tool" />
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <span className={`font-medium ${tone.emphasis}`}>Swiss Grid Generator</span>
          <br />
          A web-based tool for generating modular typographic grids based on Josef
          Muller-Brockmann&apos;s &ldquo;Grid Systems in Graphic Design&rdquo; (1981).
        </p>
      </section>

      <section className={`space-y-2 border-t pt-3 ${tone.divider}`}>
        <SectionHeaderRow label="Developer" />
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          <a href="https://lp45.net" className={tone.link}>
            lp45.net
          </a>
        </p>
      </section>

      <section className={`space-y-2 border-t pt-3 ${tone.divider}`}>
        <SectionHeaderRow label="License" />
        <p className={`text-xs leading-relaxed ${tone.body}`}>
          Copyleft &amp; -right 2026. All rights reserved.
        </p>
      </section>

      <section className={`space-y-2 border-t pt-3 ${tone.divider}`}>
        <SectionHeaderRow label="Contact" />
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
