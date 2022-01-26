import { Step } from "../slidedeck";

export type Transition = {
    duration: number, 
    alignment: number, 
    mode: string, 
    callback: (number) => void
}

export function isEntering(node: Element, step: Step) {
    if (node.hasAttribute("min-stage")) {
        return parseInt(node.getAttribute("min-stage"), 10) === step.stage;
    } else {
        return step.isFirst;
    }
}

export function isExiting(node: Element, step: Step) {
    if (node.hasAttribute("min-stage")) {
        return parseInt(node.getAttribute("max-stage"), 10) === step.stage;
    } else {
        return step.isLast;
    }
}

export function animationOffset(node: Element, step: Step) {
    if (node.hasAttribute("min-stage")) {
        return step.stage - parseInt(node.getAttribute("min-stage"), 10);
    } else {
        return step.stage;
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
    let insertedNode;
    if (referenceNode != null) {
        const refId = referenceNode.getAttribute("id");
        const refNodeInDom = intoDom.querySelector(`#${refId}`);
        insertedNode = correspondingParent.insertBefore(ghostNode, refNodeInDom);
    } else {
        insertedNode = correspondingParent.appendChild(ghostNode);
    }
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
        console.error(`Couldn't match parent with id #${parentId}, using ${correspondingParent.id} instead.`);
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

/**
 * Index so you can quickly find DOM elements by their ID
 * if they have the `[move]` attribute
 */
export class MoveElementIndex {
    dom: HTMLElement
    index: {[id: string]: HTMLElement}

    constructor(dom: HTMLElement) {
        this.dom = dom;
        this._buildIndex();
    }

    /**
     * Quickly find a dom node in this stage by ID
     * Used to match `move`ing nodes between stages
     */
    nodeByIdentifier(identifier) {
        return this.index[identifier];
    }

    addEntry(identifier, node) {
        this.index[identifier] = node;
    }

    _buildIndex() {
        this.index = {};
        this.dom.querySelectorAll("[move]").forEach(node => {
            this.index[node.getAttribute("id")] = node as HTMLElement;
        });
    }
}
