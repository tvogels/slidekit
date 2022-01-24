import {Transformer} from '@parcel/plugin';
import idParser from './idParser.js';
import Base64 from 'crypto-js/enc-base64';
import md5 from 'crypto-js/md5';
import Latin1 from 'crypto-js/enc-latin1';
import {JSDOM} from "jsdom";

const dom = new JSDOM("");
const { document } = dom.window;
const Node = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4, // historical
  ENTITY_REFERENCE_NODE: 5, // historical
  ENTITY_NODE: 6, // historical
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12 // historical
};

export default (new Transformer({
  async transform({asset}) {
    asset.bundleBehavior = 'inline';
    asset.meta.inlineType = 'string';
    const dom = svgStringToDom(await asset.getCode());
    const assets = [asset];
    processNode(dom, assets);
    asset.setCode(dom.outerHTML);
    return assets;
  },
}));

function processNode(node, assets, root = null, idStack = []) {
    // Parse the ID syntax     anythingblabla[attrkey=attrval][attrkey=attrval]
    if (root == null) root = node;
    const {nodeType, tagName} = node;
    if (nodeType !== Node.TEXT_NODE && nodeType !== Node.COMMENT_NODE && nodeType !== Node.DOCUMENT_NODE) {
        if (node.id != null && node.id !== "") {
            parsed = idParser(node.id);
            node.id = parsed.id ?? "";
            for (let {key, value} of parsed.attributes) {
                node.setAttribute(key, value ?? true);
            }
            if (node.hasAttribute("move")) {
                idStack = [...idStack, node.id];
                node.id = idStack.join("-");
            }
        }
    }

    // Make sure IDs from 'moving' elements are unique
    if (nodeType === Node.ELEMENT_NODE && node.hasAttribute("move")) {
      node.id = `${node.id.replace(/ /g, "-")}-moving`;
    }

    // Remove some <g> tags and move their children up in the hierarchy
    // | To make transitioning of objects more reliable, we remove as many group tags that are
    // | not meaningful for transitions.
    // | Any group that is not moving from one slide to the next can be deleted from the DOM hierarchy.
    if (nodeType === Node.ELEMENT_NODE && tagName === "g") {
        const shouldBeRemoved = !node.hasAttribute("move");
        if (shouldBeRemoved) {
            const parent = node.parentNode;
            for (let child of [...node.childNodes]) {
                child = parent.appendChild(child);
                for (let {name, value} of node.attributes) {
                    applyAttrToGroupsChild(child, name, value);
                }
                processNode(child, assets, root, idStack);
            }
            node = parent.removeChild(node);
            return;
        }
    }

    // Inline 'use' statements
    // This makes it easier to transition elements form one page to the next
    // without worrying about breaking references.
    if (nodeType === Node.ELEMENT_NODE && tagName === "use") {
        const defs = root.getElementsByTagName("defs")[0];
        const refId = node.getAttribute("xlink:href").slice(1);
        for (let candidate of [...defs.childNodes]) {
            if (candidate.nodeType === Node.ELEMENT_NODE && candidate.id === refId) {
                const definition = candidate.cloneNode(true)
                definition.removeAttribute("id");
                for (let {name, value} of node.attributes) {
                    if (name !== "xlink:href") {
                        definition.setAttribute(name, value);
                    }
                }
                node.parentNode.insertBefore(definition, node);
                node.parentNode.removeChild(node);
                break;
            }
        }
    }

    // Deal with <tspan>'s
    // | Tspans don't support CSS transitions, so if a text entry has multiple tspan children,
    // | we break them apart into their own <text> parent.
    if (nodeType === Node.ELEMENT_NODE && tagName === "text" && node.hasAttribute("move")) {
        let textNode = node;
        let i = 0;
        for (let child of [...textNode.childNodes]) {
            if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "tspan") {
                i++;
                let tspanNode = child;
                const newText = node.cloneNode(false);
                tspanNode = textNode.removeChild(tspanNode);
                newText.appendChild(tspanNode);
                if (tspanNode.hasAttribute("x") && tspanNode.hasAttribute("y")) {
                    const x = parseFloat(tspanNode.getAttribute("x"), 10);
                    const y = parseFloat(tspanNode.getAttribute("y"), 10);
                    tspanNode.removeAttribute("x");
                    tspanNode.removeAttribute("y");
                    newText.setAttribute("transform", `translate(${x},${y})`);
                    newText.setAttribute("id", newText.id + "-" + `${i}`);
                }
                textNode.parentNode.insertBefore(newText, textNode)
            }
        }
        textNode = textNode.parentNode.removeChild(textNode);
    }

    // Replace polylines by "path" because they morph better
    if (nodeType === Node.ELEMENT_NODE && tagName === "polyline") {
        const points = node.getAttribute("points");
        node.removeAttribute("points");
        const path = document.createElement("path");
        for (let {name, value} of node.attributes) {
          path.setAttribute(name, value);
        }
        const xy = points.split(" ");
        const xx = xy.filter((_, i) => i % 2 === 0);
        const yy = xy.filter((_, i) => i % 2 === 1);
        let d = `M${xx[0]} ${yy[0]}`;
        for (let i = 1; i < xx.length; ++i) {
            d += ` L${xx[i]} ${yy[i]}`;
        }
        path.setAttribute("d", d);
        node.parentNode.insertBefore(path, node);
        node.parentNode.removeChild(node);
    }

    // Delete inline images, because they make the file too big
    if (nodeType === Node.ELEMENT_NODE && tagName === "image" && node.getAttribute("xlink:href").slice(0, 5) === "data:") {
        const content = node.getAttribute("xlink:href");
        const hexhash = md5(content);
        const dataIdx = content.indexOf(",") + 1;
        const slashIdx = content.indexOf("/");
        const semicolonIdx = content.indexOf(";");
        const extension = content.slice(slashIdx + 1, semicolonIdx);
        const filename = `${hexhash}.${extension}`;
        assets.push({
          uniqueKey: filename,
          content: Buffer.from(Latin1.stringify(Base64.parse(content.slice(dataIdx))), 'latin1'),
          type: extension,
        });
        const depId = assets[0].addDependency({
          specifier: filename,
          specifierType: 'url'
        });
        node.removeAttribute("xlink:href");
        node.setAttribute("href", depId);
    }

    [...node.childNodes].forEach(child => processNode(child, assets, root, idStack));
}

function svgStringToDom(string) {
    const html = document.createElement("html");
    html.innerHTML = `${string}`;
    return html.querySelector("svg");
}

function applyAttrToGroupsChild(node, attribute, value) {
    //This is used when a DOM node <g> is removed, and its children are moved
    // one step up in the hierarchy.
    // It's children need to inherit some of the parent's properties.
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (attribute === "id") return;
    if (attribute === "transform") {
        node.setAttribute(attribute, value + " " + (node.getAttribute("transform") || "").trim());
    } else if (attribute === "opacity") {
        node.setAttribute(attribute, parseFloat(node.getAttribute("opacity"), 10) * parseFloat(value, 10))
    } else if (attribute === "x" || attribute === "y") {
        let newValue = parseFloat(value, 10);
        if (node.hasAttribute(attribute)) {
            newValue += parseFloat(node.getAttribute(attribute), 10);
        }
        node.setAttribute(attribute, newValue);
    } else if (!node.hasAttribute(attribute)) {
        node.setAttribute(attribute, value);
    }
}
