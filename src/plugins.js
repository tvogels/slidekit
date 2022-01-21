/**
 * Embed YouTube videos by using the `youtube=ID` attribute to a `<rect>`
 * @param {HTMLElement} dom SVG Dom tree to which you can do any pre-processing
 */
export function youtubePlugin(dom) {
    for (let node of dom.querySelectorAll("[youtube]")) {
        const id = node.getAttribute("youtube");

        // Create a <foreignObject> svg node that has the same size
        // as the original rectangle
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("x", node.getAttribute("x"));
        foreignObject.setAttribute("y", node.getAttribute("y"));
        foreignObject.setAttribute("height", node.getAttribute("height"));
        foreignObject.setAttribute("width", node.getAttribute("width"));

        foreignObject.innerHTML = `<iframe width="${node.getAttribute("width")}" height="${node.getAttribute(
            "height"
        )}" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

        // Replace the original rectangle by the <foreignObject>
        const parent = node.parentElement;
        parent.insertBefore(foreignObject, node);
        parent.removeChild(node);
    }
}

/**
 * This allows you to use a new `scale="2.5"` attribute to apply CSS scale transformations
 * to a node.
 * @param {HTMLElement} dom
 */
export function scalePlugin(dom) {
    // Scale
    for (let node of dom.querySelectorAll("[scale]")) {
        const scale = node.getAttribute("scale");
        node.setAttribute("transform", node.getAttribute("transform") + " " + `scale(${scale})`);
        node.removeAttribute("scale");
    }
}

export function hyperlinkPlugin(dom) {
    // Scale
    for (let node of dom.querySelectorAll("[hyperlink]")) {
        const hyperlink = node.getAttribute("hyperlink");
        node.removeAttribute("hyperlink");
        const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
        a.setAttribute("href", hyperlink);
        node.parentElement.insertBefore(a, node);
        a.appendChild(node);

    }
}
