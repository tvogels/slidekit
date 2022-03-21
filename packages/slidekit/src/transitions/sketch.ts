import { linearMix } from "../utils";
import { parseTransitionDuration, parseTransitionAlignment } from "./utils";

export const attribute = "sketch";

export function create(node: HTMLElement, ghostNode: HTMLElement) {
    // const length = (node as any as SVGPathElement).getTotalLength();
    ghostNode.setAttribute("pathLength", "1");
    ghostNode.style.strokeDasharray = "1";
    ghostNode.style.strokeDashoffset = "1";
    (node as HTMLElement).style.opacity = "0";
    return [
        {
            duration: parseTransitionDuration(node, "sketch", 0.5, "enter"),
            alignment: parseTransitionAlignment(node, "sketch", 1.0, "enter"),
            mode: "easeInOutQuad",
            callback: (dt) => {
                if (dt < 0.5) {
                    ghostNode.style.strokeDashoffset = linearMix(1, 0.0, dt * 2);
                } else {
                    ghostNode.style.strokeDashoffset = linearMix(2, 1.0, (dt - 0.5) * 2);
                }
            },
        },
    ];
}
