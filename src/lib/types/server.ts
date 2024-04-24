import type { tTranscript, tVariableType, tDPSIR, tLink } from "."

export type tServerData = {
    interviews: tTranscript[]
    nodes: tDPSIR,
    links: tLink[]
    metadata: tMetadata
}

export type tVarTypeDef = {
    [key: string]: {
        definition: string;
        factor_type: string;
    }
}
export type tMetadata = {
    driver: tVarTypeDef
    pressure: tVarTypeDef
    state: tVarTypeDef
    impact: tVarTypeDef
    response: tVarTypeDef
}