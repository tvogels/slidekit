export default function (domNode: HTMLElement) {
    for (let node of [...domNode.querySelectorAll("[iframe]")]) {
        const foreignObject = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "foreignObject"
        );

        for (let { name, value } of node.attributes) {
            if (["stroke", "fill", "stroke-width", "fill-rule", "canvas"].indexOf(name) >= 0)
                continue;
            foreignObject.setAttribute(name, value);
        }
        
        // We added this to make sure iframes get mouse hover and mouse click events.
        // Maybe it works.
        foreignObject.setAttribute("pointer-events", "all");

        foreignObject.innerHTML = `<iframe
            width="${node.getAttribute("width")}"
            height="${node.getAttribute("height")}"
            src="${node.getAttribute("iframe")}"/>`;
        const iframe = foreignObject.querySelector("iframe");
        iframe.id = foreignObject.id + "-iframe";

        const parent = node.parentElement;
        parent.insertBefore(foreignObject, node);
        parent.removeChild(node);
    }
}
