export default class PriorityQueue {
    elements: {priority: number, element: any}[];
    constructor() {
      this.elements = [];
    }
  
    enqueue(priority, element) {
      this.elements.push({ priority, element });
      this.elements.sort((a, b) => a.priority - b.priority);
    }
  
    dequeue() {
      return this.elements.shift()?.element;
    }
  
    isEmpty() {
      return this.elements.length === 0;
    }
  
    contains(element) {
      return this.elements.some(
        (item) =>
          item.element[0] === element[0] && item.element[1] === element[1],
      );
    }
  }