import {
  computeReflowPlan,
  type ReflowPlan,
  type ReflowPlannerInput,
} from "@/lib/reflow-planner"

type ReflowPlanRequest = {
  id: number
  input: ReflowPlannerInput
}

type ReflowPlanResponse = {
  id: number
  plan: ReflowPlan
}

self.onmessage = (event: MessageEvent<ReflowPlanRequest>) => {
  const { id, input } = event.data
  const plan = computeReflowPlan(input)
  const response: ReflowPlanResponse = { id, plan }
  self.postMessage(response)
}

export {}
