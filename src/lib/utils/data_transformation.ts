import type { tLink, tVisLink, tVariableType, tVariable} from "lib/types";
export  function link_to_vis_link(data: tLink[]): tVisLink[] {
    const linksMap = new Map();
    data.forEach((item) => {
      const source = {
        var_type: item.indicator1.toLowerCase(),
        variable_name: item.var1,
      };
      const target = {
        var_type: item.indicator2.toLowerCase(),
        variable_name: item.var2,
      };
      const key = JSON.stringify({ source, target });
      if (linksMap.has(key)) {
        // Check if the chunk_id is already in the mentions for this key
        const mapEntry = linksMap.get(key);
        const chunkIdExists = mapEntry.mentions.some(
          (mention) => mention.chunk_id === item.chunk_id
        );
        if (!chunkIdExists) {
          // If the chunk_id is not already included, add it to the mentions
          mapEntry.mentions.push({
            chunk_id: item.chunk_id,
            evidence: item.response.evidence,
          });
        }
      } else {
        // If the key doesn't exist, initialize it with the current chunk_id in mentions
        linksMap.set(key, {
          source,
          target,
          mentions: [
            { chunk_id: item.chunk_id, evidence: item.response.evidence },
          ],
        });
      }
    });
    // Convert the map values to an array and adjust structure to include frequency
    const result: tVisLink[] = Array.from(linksMap.values()).map((entry) => ({
      ...entry,
      frequency: entry.mentions.length,
      mentions: entry.mentions,
    }));
    return result;
  }

export function integrateTypes(
    variableTypeData: tVariableType,
    defsData: { [key: string]: { definition: string; factor_type: string } }
  ): tVariableType {
    const variable_mentions = Object.keys(
      variableTypeData.variable_mentions
    ).reduce(
      (acc, key) => {
        const variable = variableTypeData.variable_mentions[key];
        acc[key] = {
          ...variable,
          definition: defsData[key]?.definition || "unknown", // Merge definition into each variable
          factor_type: defsData[key]?.factor_type || "unknown", // Merge factor type into each variable
        };
        return acc;
      },
      {} as { [key: string]: tVariable }
    );

    return {
      variable_type: variableTypeData.variable_type,
      variable_mentions,
    };
  }
