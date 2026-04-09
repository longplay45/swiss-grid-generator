declare module "opentype.js" {
  export type OpenTypePath = {
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
