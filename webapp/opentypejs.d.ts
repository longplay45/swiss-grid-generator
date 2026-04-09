declare module "opentype.js" {
  export type OpenTypePathCommand =
    | { type: "M"; x: number; y: number }
    | { type: "L"; x: number; y: number }
    | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
    | { type: "Q"; x1: number; y1: number; x: number; y: number }
    | { type: "Z" }

  export type OpenTypePath = {
    commands: OpenTypePathCommand[]
    toPathData: (decimalPlaces?: number) => string
  }

  export type OpenTypeFont = {
    getPath: (
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options?: {
        kerning?: boolean
        hinting?: boolean
      },
    ) => OpenTypePath
  }

  export function parse(buffer: ArrayBuffer): OpenTypeFont
}
