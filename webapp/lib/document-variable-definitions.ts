export type DocumentVariableDefinition = {
  token: string
  description: string
}

export const DOCUMENT_VARIABLE_DEFINITIONS: readonly DocumentVariableDefinition[] = [
  {
    token: "<%lorem%>",
    description: "Fill the active paragraph frame with fitted lorem ipsum.",
  },
  {
    token: "<%project_title%>",
    description: "Insert the current project title.",
  },
  {
    token: "<%page_title%>",
    description: "Insert the current page title.",
  },
  {
    token: "<%page%>",
    description: "Insert the current page number.",
  },
  {
    token: "<%pages%>",
    description: "Insert the total page count.",
  },
  {
    token: "<%date%>",
    description: "Insert the local render date.",
  },
  {
    token: "<%time%>",
    description: "Insert the local render time.",
  },
  {
    token: "<%url:https://lp45.net%>",
    description: "Insert a URL as visible text.",
  },
] as const
