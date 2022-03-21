import { getAngleAtPath } from "../utils";
import snap from "snapsvg";
import { Stage } from "../slideplayer";

export const attribute = "appear-along";

export function create(node: HTMLElement, ghostNode: HTMLElement, stage: Stage, nextStage: Stage) {
    const pathId = node.getAttribute("appear-along").split(",", 1)[0];
    const pathNode = nextStage.dom.querySelector(`#${pathId}`);
    if (pathNode == null) {
        console.error(`Could not find path #${pathId} for node ${node.id} to appear along.`);
        return [];
    }
    const path = snap(pathNode);
    const totalPathLength = path.getTotalLength();
    const endpoint = path.getPointAtLength(totalPathLength);
    const angleAtEndpoint = getAngleAtPath(path, 1.0, totalPathLength);
    const originalTransform = node.getAttribute("transform") || "";
    return [
        {
            duration: transitionDuration(node),
            alignment: transitionAlignment(node),
            mode: "easeInOutQuad",
            callback: (dt) => {
                ghostNode.setAttribute("opacity", dt > 0 ? "1" : "0");
                const pos = path.getPointAtLength(dt * totalPathLength);
                pos.x -= endpoint.x;
                pos.y -= endpoint.y;
                const angle = getAngleAtPath(path, dt, totalPathLength) - angleAtEndpoint;
                const transform = `${originalTransform} translate(${pos.x}, ${pos.y}) rotate(${angle}, ${endpoint.x}, ${endpoint.y})`;
                ghostNode.setAttribute("transform", transform);
            },
        },
    ];
}

function transitionDuration(node: Element): number {
    if (node.hasAttribute("enter-duration")) {
        return parseFloat(node.getAttribute("enter-duration"));
    }
    const attr = (node.getAttribute("appear-along") || "").split(",");
    const userValue = parseFloat(attr[1]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return 0.5;
    }
}

function transitionAlignment(node: Element) {
    if (node.hasAttribute("enter-alignment")) {
        return parseFloat(node.getAttribute("enter-alignment"));
    }
    const attr = (node.getAttribute("appear-along") || "").split(",");
    const userValue = parseFloat(attr[2]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return 1.0;
    }
}
