export function draggable(node) {
  let moving = false;
  let prev_left = undefined;
  let prev_top = undefined;
  let left = undefined;
  let top = undefined;
  let initial_left = undefined;
  let initial_top = undefined;
  node.style.position = "absolute";
  node.style.cursor = "move";
  node.style.userSelect = "none";
  node.style.zIndex = "10";
  node.childNodes.forEach((child) => {
    child.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    if (child.style && child.style.cursor === "") child.style.cursor = "auto";
  });

  node.addEventListener("mousedown", (e) => {
    if (e.defaultPrevented) return;
    moving = true;
    prev_left = e.clientX;
    prev_top = e.clientY;
    initial_left = node.offsetLeft;
    initial_top = node.offsetTop;
  });

  window.addEventListener("mousemove", (e) => {
    if (e.defaultPrevented) return;
    if (moving) {
      left = e.clientX - prev_left + initial_left;
      top = e.clientY - prev_top + initial_top;
      node.style.top = `${top}px`;
      node.style.left = `${left}px`;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (e.defaultPrevented) return;
    moving = false;
  });
}
