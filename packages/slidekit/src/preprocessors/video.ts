export default function (dom: HTMLElement) {
    for (let node of [...dom.querySelectorAll("[video]")]) {
        const foreignObject = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "foreignObject"
        );

        foreignObject.setAttribute("x", node.getAttribute("x"));
        foreignObject.setAttribute("y", node.getAttribute("y"));
        foreignObject.setAttribute("height", node.getAttribute("height"));
        foreignObject.setAttribute("width", node.getAttribute("width"));

        foreignObject.innerHTML = `<video width="${node.getAttribute(
            "width"
        )}" height="${node.getAttribute("height")}" src="${node.getAttribute("video")}"></video>`;
        const video = foreignObject.querySelector("video");
        if (node.hasAttribute("id")) {
            video.id = node.id + "-video";
        }

        for (let { name, value } of node.attributes) {
            if (
                ["stroke", "fill", "stroke-width", "fill-rule", "video", "x", "y"].indexOf(name) >=
                0
            )
                continue;
            video.setAttribute(name, value);
        }

        video.style.width = `100%`;
        video.style.height = `100%`;

        const parent = node.parentElement;
        parent.insertBefore(foreignObject, node);
        // document.body.appendChild(video);
        parent.removeChild(node);
    }
}
