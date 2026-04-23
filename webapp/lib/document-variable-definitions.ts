export type DocumentVariableDefinition = {
  token: string
  description: string
}

export const DOCUMENT_VARIABLE_DEFINITIONS: readonly DocumentVariableDefinition[] = [
  {
    token: "<% lorem %>",
    description: "Fill the active paragraph frame with fitted lorem ipsum.",
  },
  {
    token: "<% project_title %>",
    description: "Insert the current project title.",
  },
  {
    token: "<% title %>",
    description: "Alias of the current project title.",
  },
  {
    token: "<% page %>",
    description: "Insert the current page number.",
  },
  {
    token: "<% pages %>",
    description: "Insert the total page count.",
  },
  {
    token: "<% date %>",
    description: "Insert the local render date.",
  },
  {
    token: "<% time %>",
    description: "Insert the local render time.",
  },
] as const
