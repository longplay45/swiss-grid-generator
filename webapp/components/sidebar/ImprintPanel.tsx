export function ImprintPanel() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Imprint</h3>
      <div className="space-y-3 text-xs text-gray-600">
        <p>
          <strong>Swiss Grid Generator</strong>
          <br />A web-based tool for generating modular typographic grids based on Josef
          Müller-Brockmann&apos;s &ldquo;Grid Systems in Graphic Design&rdquo; (1981).
        </p>
        <p>
          <strong>Developer:</strong>
          <br />
          <a href="https://lp45.net" className="text-blue-600 hover:underline">
            lp45.net
          </a>
        </p>
        <p>
          <strong>License:</strong>
          <br />
          Copyleft &amp; -right 2026. All rights reserved.
        </p>
        <p>
          <strong>Source Code:</strong>
          <br />
          <a
            href="https://github.com/longplay45/swiss-grid-generator"
            className="text-blue-600 hover:underline"
          >
            github.com/longplay45/swiss-grid-generator
          </a>
        </p>
        <p>
          <strong>Technologies:</strong>
          <br />
          Next.js, React, TypeScript, Tailwind CSS, jsPDF
        </p>
        <p className="pt-2 text-[11px] text-gray-400">
          This tool is inspired by the principles of Swiss Design and the International Typographic
          Style. The generated grids are intended for educational and design purposes.
        </p>
      </div>
    </div>
  )
}
