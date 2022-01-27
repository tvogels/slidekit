export default function (dom: HTMLElement) {
    for (let node of [...dom.querySelectorAll("[canvas]")]) {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");

        const { width, height, x, y } = node.getBoundingClientRect();
        foreignObject.setAttribute("x", `${x}`);
        foreignObject.setAttribute("y", `${y}`);
        foreignObject.setAttribute("height", `${height}`);
        foreignObject.setAttribute("width", `${width}`);

        foreignObject.innerHTML = `<canvas width="${width}" height="${height}" />`;
        const canvas = foreignObject.querySelector("canvas")
        canvas.id = foreignObject.id + "-canvas";

        // Restores proper render order in Chrome.
        canvas.getContext('2d').getImageData(0, 0, 1, 1);

        const parent = node.parentElement;
        parent.insertBefore(foreignObject, node);
        parent.removeChild(node);
    }
}
