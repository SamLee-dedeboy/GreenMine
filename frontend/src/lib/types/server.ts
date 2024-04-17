import type { tTranscript, tVariableType, tLink } from "."

export type tServerData = {
    interviews: tTranscript[]
    driver_nodes: tVariableType
    pressure_nodes: tVariableType
    state_nodes: tVariableType
    impact_nodes: tVariableType
    response_nodes: tVariableType
    links: tLink[]
    driver_defs:any
    pressure_defs:any
    state_defs:any
    impact_defs:any
    response_defs:any
}