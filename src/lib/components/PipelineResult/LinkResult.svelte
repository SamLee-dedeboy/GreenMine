<script lang="ts">
  import LinkResultGraph from "./LinkResultGraph.svelte";
  import type { tIdentifyLinks } from "lib/types";
  import { onMount, createEventDispatcher } from "svelte";
  import { varTypeColorScale } from "lib/store";
  const dispatch = createEventDispatcher();
  export let datum: tIdentifyLinks;
  export let isNone: boolean;
  export let index: number;
  export let max_degree: number;
  let show_graph: boolean = false;
  function generate_explanation_html(
    indicator1: string,
    indicator2: string,
    var1: string,
    var2: string,
    relationship: { label: string; confidence: number | undefined }[],
    explanation: string,
  ) {
    return (
      `
    <span style="background-color: ${$varTypeColorScale(indicator1)}; text-transform: capitalize; padding-left: 0.125rem; padding-right: 0.125rem;">${var1}</span>
    -
    <span style="background-color: ${$varTypeColorScale(indicator2)}; text-transform: capitalize; padding-left: 0.125rem; padding-right: 0.125rem;">${var2}</span>
    <br>` +
      (Array.isArray(relationship)
        ? `<span style="color: gray; text-transform: capitalize">${relationship.map((r) => `${r.label}(${(1 - r.confidence!).toFixed(2)})`).join("/")}</span>`
        : `<span style="color: gray; text-transform: capitalize">${relationship}</span>`) +
      `<br> - ${explanation}`
    );
  }
  onMount(() => {
    console.log({ datum });
  });
</script>

<div class="relative flex" class:isNone>
  <div class="w-[4rem] shrink-0 text-[0.9rem]">
    {datum.id}
  </div>
  {#if isNone}
    <div class="border-l border-l-gray-300 pl-1 text-sm">None</div>
  {:else if show_graph}
    <div class="w-full">
      <div class="flex bg-gray-200 py-0.5">
        <div
          tabindex="0"
          class="ml-1 w-fit rounded-sm bg-gray-100 px-1 text-center text-[0.7rem] italic text-gray-500 outline-double outline-1 outline-gray-300 hover:bg-gray-300 hover:shadow-md"
          role="button"
          on:click={() => (show_graph = !show_graph)}
          on:keyup={() => {}}
        >
          list view
        </div>
        {#if datum.uncertainty?.identify_links}
          <div
            class="ml-auto flex items-center pl-1 text-xs italic text-gray-600"
          >
            Overall uncertainty: {datum.uncertainty.identify_links.toFixed(2)}
          </div>
        {/if}
      </div>
      <LinkResultGraph
        svgId={`link-graph-${index}`}
        data={datum.identify_links_result}
        {max_degree}
        on:link-clicked={(e) => {
          const link = e.detail;
          if (link.response.evidence && link.response.evidence.length > 0) {
            dispatch("navigate_evidence", {
              chunk_id: datum.id,
              evidence: link.response.evidence,
              explanation: generate_explanation_html(
                link.indicator1,
                link.indicator2,
                link.var1,
                link.var2,
                link.response.relationship,
                link.response.explanation,
              ),
            });
          }
        }}
      />
    </div>
  {:else}
    <div
      class="result flex w-full flex-col divide-y divide-dashed divide-gray-400 border-l border-l-gray-300"
    >
      <div class="flex bg-gray-200 py-0.5">
        <div
          tabindex="0"
          class="ml-1 w-fit rounded-sm bg-gray-100 px-1 text-center text-[0.7rem] italic text-gray-500 outline-double outline-1 outline-gray-300 hover:bg-gray-300 hover:shadow-md"
          role="button"
          on:click={() => (show_graph = !show_graph)}
          on:keyup={() => {}}
        >
          graph view
        </div>
        {#if datum.uncertainty?.identify_links}
          <div
            class="ml-auto flex items-center pl-1 text-xs italic text-gray-600"
          >
            Overall uncertainty: {datum.uncertainty.identify_links.toFixed(2)}
          </div>
        {/if}
      </div>
      {#each datum.identify_links_result as link}
        <div
          role="button"
          tabindex="0"
          class="flex cursor-pointer flex-col gap-y-1 bg-gray-100 py-1 pl-1 pr-3 hover:bg-gray-200"
          title="check evidence"
          on:click={() => {
            if (link.response.evidence && link.response.evidence.length > 0) {
              dispatch("navigate_evidence", {
                chunk_id: datum.id,
                evidence: link.response.evidence,
                explanation: generate_explanation_html(
                  link.indicator1,
                  link.indicator2,
                  link.var1,
                  link.var2,
                  link.response.relationship,
                  link.response.explanation,
                ),
              });
            }
          }}
          on:keyup={() => {}}
        >
          <div class="flex items-center">
            <div
              class="h-fit shrink-0 rounded-sm px-0.5 text-xs italic opacity-70 outline-double outline-1 outline-gray-300"
              style={`background-color: ${$varTypeColorScale(link.indicator1)}`}
            >
              {link.var1}
            </div>
            <div class="w-6 text-sm font-light">---</div>
            <div
              class="h-fit shrink-0 rounded-sm px-0.5 text-xs italic opacity-70 outline-double outline-1 outline-gray-300"
              style={`background-color: ${$varTypeColorScale(link.indicator2)}`}
            >
              {link.var2}
            </div>
          </div>
          <div class="flex w-full text-sm">
            <div class="flex flex-col">
              {#if Array.isArray(link.response.relationship)}
                {#each link.response.relationship as relationship}
                  <div class="flex items-center gap-x-1 italic text-gray-500">
                    <div class="px-0.5 text-left capitalize">
                      {relationship.label}
                    </div>
                    <div class="mt-[0.125rem] text-xs">
                      {(1 - relationship.confidence).toFixed(2)}
                    </div>
                  </div>
                {/each}
              {:else}
                <div
                  class="px-0.5 text-left text-xs capitalize italic text-gray-500"
                >
                  {link.response.relationship}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
