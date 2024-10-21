<script lang="ts">
  import { KeyWordRect } from "lib/renderers/KeywordRect";
  import { varTypeColorScale } from "lib/store";
  import type { tKeywordData } from "lib/types";
  import { onMount, getContext } from "svelte";
  export let data: tKeywordData;
  export let key: string = "keyword";
  export let show_key: boolean = true;
  export let degree_key = "tf_idf";
  // const degree_key = "frequency";
  const svgId = `keyword-sea-${key}-svg`;
  // const keyword_sea_renderer = new KeyWordSea();
  const keyword_sea_renderer = new KeyWordRect();
  let mounted = false;
  const handleHighlightChunks = getContext("handleHighlightChunks") as Function;

  $: if (mounted) {
    keyword_sea_renderer.update_keywords(
      data,
      degree_key,
      $varTypeColorScale(key),
    );
  }

  function handleKeywordSelected(keyword: string) {
    handleHighlightChunks(data.keyword_statistics[keyword].mentions);
  }

  onMount(() => {
    console.log("keyword sea: ", { data });
    const container = document.querySelector(".keywordsea-container")!;
    const svgSize = {
      width: container.clientWidth,
      height: container.clientHeight,
    };
    keyword_sea_renderer.init(svgId, svgSize.width, svgSize.height);
    keyword_sea_renderer.on("keywordSelected", handleKeywordSelected);
    keyword_sea_renderer.update_keywords(
      data,
      degree_key,
      $varTypeColorScale(key),
    );
    mounted = true;
  });
</script>

<div class="keywordsea-container relative h-full w-full p-2">
  {#if show_key}
    <div
      class="absolute left-2 top-0 w-fit rounded font-serif text-[2rem] font-bold capitalize"
      style={`color: ${$varTypeColorScale(key)}`}
    >
      {key}
    </div>
  {/if}
  <div
    class="tooltip pointer-events-none absolute h-fit w-fit rounded border border-black bg-white py-1 pl-0.5 pr-1 text-xs opacity-0"
  ></div>
  <svg id={svgId}></svg>
</div>

<style lang="postcss">
  svg {
    & .rect-hover {
      stroke-width: 3;
    }
  }
</style>
