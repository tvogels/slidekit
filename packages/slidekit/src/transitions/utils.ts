import { Step } from "../slidedeck";

export type Transition = {
    duration: number;
    alignment: number;
    mode: string;
    callback: (number) => void;
};

export function isEntering(node: Element, step: Step) {
    if (node.hasAttribute("min-stage")) {
        return parseInt(node.getAttribute("min-stage"), 10) === step.numberWithinSlide;
    } else {
        return step.numberWithinSlide == 0;
    }
}

export function isExiting(node: Element, step: Step) {
    if (node.hasAttribute("min-stage")) {
        return parseInt(node.getAttribute("max-stage"), 10) === step.numberWithinSlide;
    } else {
        return step.numberWithinSlide == step.slide.steps.length - 1;
    }
}

export function animationOffset(node: Element, step: Step) {
    if (node.hasAttribute("min-stage")) {
        return step.numberWithinSlide - parseInt(node.getAttribute("min-stage"), 10);
    } else {
        return step.numberWithinSlide;
    }
}

/**
 * Insert a ghost element into a DOM tree corresponding to an element that will appear on the next slide.
 * We can use this to make elements appear with an effect.
 * We are careful about ordering to get depth-disocclusions right.
 */
export function insertGhostNode(node: HTMLElement, intoDom: HTMLElement): HTMLElement {
    const correspondingParent = findCorrespondingParent(node, intoDom);
    const ghostNode = node.cloneNode(true) as HTMLElement;
    const referenceNode = nextStayingChild(node, intoDom);
    if (referenceNode != null) {
        const refNodeInDom = intoDom.querySelector(`#${referenceNode.id}`);
        correspondingParent.insertBefore(ghostNode, refNodeInDom);
    } else {
        correspondingParent.appendChild(ghostNode);
    }
    ghostNode.classList.add("ghost");
    return ghostNode;
}

/**
 * Select a node in `domTree` that looks most like the parent of `node`
 */
function findCorrespondingParent(node: HTMLElement, domTree: HTMLElement): HTMLElement {
    const parentId = node.parentElement.id;
    let correspondingParent;
    if (domTree.id === parentId) {
        correspondingParent = domTree;
    } else {
        correspondingParent = domTree.querySelector("#" + parentId);
    }
    if (correspondingParent == null) {
        correspondingParent = domTree;
        console.error(
            `Couldn't match parent with id #${parentId}, using ${correspondingParent.id} instead.`
        );
    }
    return correspondingParent;
}

/**
 * Utility used by insertGhostNode to find the next node that
 * 'matters' in terms of occlusions for ghost nodes.
 */
function nextStayingChild(node: HTMLElement, otherTree: HTMLElement): HTMLElement | null {
    let it = node.nextElementSibling;
    while (it != null) {
        if (it.hasAttribute("id") && otherTree.querySelector(`#${it.id}`) != null) {
            return it as HTMLElement;
        }
        it = it.nextElementSibling;
    }
    return null;
}

export function getMoveElementById(id: string, dom: HTMLElement): HTMLElement | null {
    const result = dom.querySelector(`#${id}`);
    if (result == null || !result.hasAttribute("move")) {
        return null;
    } else {
        return result as HTMLElement;
    }
}

export function parseTransitionDuration(
    node: Element,
    attribute: string,
    defaultValue: number,
    type = "exit"
): number {
    if (node.hasAttribute(`${type}-duration`)) {
        return parseFloat(node.getAttribute(`${type}-duration`));
    } else {
        const attr = (node.getAttribute(attribute) || "").split(",");
        const userValue = parseFloat(attr[0]);
        if (isFinite(userValue)) {
            return userValue;
        } else {
            return defaultValue;
        }
    }
}

export function parseTransitionAlignment(
    node: Element,
    attribute: string,
    defaultValue: number,
    type = "exit"
): number {
    if (node.hasAttribute(`${type}-alignment`)) {
        return parseFloat(node.getAttribute(`${type}-alignment`));
    } else {
        const attr = (node.getAttribute(attribute) || "").split(",");
        const userValue = parseFloat(attr[1]);
        if (isFinite(userValue)) {
            return userValue;
        } else {
            return defaultValue;
        }
    }
}
