export default function (dom: HTMLElement) {
    for (let node of [...dom.querySelectorAll("[canvas]")]) {
        const foreignObject = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "foreignObject"
        );

        for (let { name, value } of node.attributes) {
            if (["stroke", "fill", "stroke-width", "fill-rule", "canvas"].indexOf(name) >= 0)
                continue;
            foreignObject.setAttribute(name, value);
        }

        foreignObject.innerHTML = `<canvas width="${node.getAttribute(
            "width"
        )}" height="${node.getAttribute("height")}" />`;
        const canvas = foreignObject.querySelector("canvas");
        canvas.id = foreignObject.id + "-canvas";

        // Restores proper render order in Chrome.
        canvas.getContext("2d").getImageData(0, 0, 1, 1);

        const parent = node.parentElement;
        parent.insertBefore(foreignObject, node);
        parent.removeChild(node);
    }
}
