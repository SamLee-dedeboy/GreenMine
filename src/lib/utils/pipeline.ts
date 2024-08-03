import type {
  tChunk,
  tIdentifyLinks,
  tIdentifyVars,
  tIdentifyVarTypes,
} from "lib/types";
export function sort_by_id<
  T extends tIdentifyVarTypes | tIdentifyVars | tIdentifyLinks,
>(chunks: T[]): T[] {
  return chunks.sort((a, b) => {
    const pid_a = a.id.replace("N", "").split("_")[0];
    const pid_b = b.id.replace("N", "").split("_")[0];
    if (pid_a === pid_b) {
      return +a.id.split("_")[1] - +b.id.split("_")[1];
    } else {
      return +pid_a - +pid_b;
    }
  });
}

const var_type_indices = {
  driver: 0,
  pressure: 1,
  state: 2,
  impact: 3,
  response: 4,
};
export function compare_var_types(a: string, b: string) {
  return var_type_indices[a] - var_type_indices[b];
}
export function sort_by_var_type(var_types: string[]) {
  return var_types.sort((a, b) => {
    return var_type_indices[a] - var_type_indices[b];
  });
}
