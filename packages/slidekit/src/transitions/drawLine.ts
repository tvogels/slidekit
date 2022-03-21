import { linearMix } from "../utils";
import { parseTransitionDuration, parseTransitionAlignment } from "./utils";

export const attribute = "draw-line";

export function create(node: HTMLElement, ghostNode: HTMLElement) {
    ghostNode.setAttribute("pathLength", "1");
    ghostNode.style.strokeDasharray = "1";
    ghostNode.style.strokeDashoffset = "1";
    return [
        {
            duration: parseTransitionDuration(node, "draw-line", 0.5, "enter"),
            alignment: parseTransitionAlignment(node, "draw-line", 1.0, "enter"),
            mode: "easeInOutQuad",
            callback: (dt) => {
                ghostNode.style.strokeDashoffset = linearMix(1.0, 0.0, dt);
            },
        },
    ];
}
