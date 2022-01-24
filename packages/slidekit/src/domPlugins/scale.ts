/**
 * This allows you to use a new `scale="2.5"` attribute to apply CSS scale transformations
 * to a node.
 * @param {HTMLElement} dom
 */
export default function (dom: HTMLElement) {
    // Scale
    for (let node of [...dom.querySelectorAll("[scale]")]) {
        const scale = node.getAttribute("scale");
        node.setAttribute("transform", node.getAttribute("transform") + " " + `scale(${scale})`);
        node.removeAttribute("scale");
    }
}