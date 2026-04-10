export function resolveCurrentPreviewLayout<Layout>({
  preferCommittedLayout,
  committedLayout,
  getLivePreviewLayout,
}: {
  preferCommittedLayout: boolean
  committedLayout: Layout | null
  getLivePreviewLayout: (() => Layout | null) | null
}): Layout | null {
  if (preferCommittedLayout && committedLayout) {
    return committedLayout
  }

  return getLivePreviewLayout?.() ?? committedLayout
}
