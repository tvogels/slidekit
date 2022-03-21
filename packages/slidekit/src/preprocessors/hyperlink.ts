export default function (dom: HTMLElement) {
    for (let node of [...dom.querySelectorAll("[hyperlink]")]) {
        const hyperlink = node.getAttribute("hyperlink");
        node.removeAttribute("hyperlink");
        const a = document.createElementNS("http://www.w3.org/2000/svg", "a");
        a.setAttribute("href", hyperlink);
        node.parentElement.insertBefore(a, node);
        a.appendChild(node);
    }
}
