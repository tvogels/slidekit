import { Transformer } from "@parcel/plugin";
import idParser from "./idParser.js";
import Base64 from "crypto-js/enc-base64";
import crypto from "crypto";
import Latin1 from "crypto-js/enc-latin1";
import { JSDOM } from "jsdom";
import path from "path";
import { mkdir, stat, writeFile } from "fs/promises";

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
    NOTATION_NODE: 12, // historical
};

const cacheDir = ".slidekit-cache";

export default new Transformer({
    async transform({ asset }) {
        asset.bundleBehavior = "inline";
        asset.meta.inlineType = "string";
        const dom = svgStringToDom(await asset.getCode());

        dom.setAttribute("width", parseInt(dom.getAttribute("width")));
        dom.setAttribute("height", parseInt(dom.getAttribute("height")));

        const assets = [asset];
        await processNode(dom, assets);
        removeDuplicateIds(dom);

        asset.setCode(dom.outerHTML);

        return assets;
    },
});

async function processNode(node, assets, root = null, idStack = []) {
    // Parse the ID syntax     anythingblabla[attrkey=attrval][attrkey=attrval]
    if (root == null) root = node;
    const { nodeType, tagName } = node;
    if (
        nodeType !== Node.TEXT_NODE &&
        nodeType !== Node.COMMENT_NODE &&
        nodeType !== Node.DOCUMENT_NODE
    ) {
        if (node.id != null && node.id !== "") {
            try {
                parsed = idParser(node.id);
            } catch (error) {
                throw new Error(`Failed to parse the ID ${node.id}`);
            }
            node.id = parsed.id ?? "";
            for (let { key, value } of parsed.attributes) {
                node.setAttribute(key, value ?? "");
            }
            if (node.hasAttribute("move")) {
                idStack = [...idStack, node.id];
                node.id = idStack.join("-");
            }
        }
    }

    if (nodeType === Node.ELEMENT_NODE && node.hasAttribute("id")) {
        node.id = node.id.replace(/ /g, "-");
    }
    const regex = /(^[A-Za-z]|(^$))/;
    if (node.id != null && !node.id.match(regex)) {
        node.id = "id" + node.id;
    }

    // Process video nodes
    if (nodeType === Node.ELEMENT_NODE && node.hasAttribute("video")) {
        const src = node.getAttribute("video");
        const isLocalFile = !(src.startsWith("http://") || src.startsWith("https://"));
        if (isLocalFile) {
            let depId = assets[0].addURLDependency(`./${src}`);
            node.setAttribute("video", depId);
        }
    }

    // Remove some <g> tags and move their children up in the hierarchy
    // | To make transitioning of objects more reliable, we remove as many group tags that are
    // | not meaningful for transitions.
    // | Any group that is not moving from one slide to the next can be deleted from the DOM hierarchy.
    if (nodeType === Node.ELEMENT_NODE && tagName === "g") {
        const shouldBeRemoved =
            !node.hasAttribute("move") &&
            !node.hasAttribute("keep") &&
            !node.hasAttribute("clip-path");
        if (shouldBeRemoved) {
            const parent = node.parentNode;
            for (let child of [...node.childNodes]) {
                child = parent.insertBefore(child, node);
                for (let { name, value } of node.attributes) {
                    applyAttrToGroupsChild(child, name, value);
                }
                processNode(child, assets, root, idStack);
            }
            node = parent.removeChild(node);
            return;
        } else if (node.hasAttribute("move")) {
            for (let attribute of [...node.attributes]) {
                if (
                    ![
                        "id",
                        "move",
                        "transform",
                        "opacity",
                        "fade-in",
                        "fade-out",
                        "transition-duration",
                        "enter-duration",
                        "exit-duration",
                        "enter-alignment",
                        "exit-alignment",
                        "stage",
                    ].includes(attribute.name)
                ) {
                    for (let child of [...node.childNodes]) {
                        applyAttrToGroupsChild(child, attribute.name, attribute.value);
                    }
                    node.removeAttribute(attribute.name);
                }
            }
        }
    }

    // Inline 'use' statements
    // This makes it easier to transition elements form one page to the next
    // without worrying about breaking references.
    if (nodeType === Node.ELEMENT_NODE && tagName === "use") {
        const defs = root.getElementsByTagName("defs")[0];
        const refId = node.getAttribute("xlink:href").slice(1);
        for (let candidate of [...defs.childNodes]) {
            if (candidate.tagName === "symbol") {
                continue;
            }
            if (candidate.nodeType === Node.ELEMENT_NODE && candidate.id === refId) {
                const definition = candidate.cloneNode(true);
                definition.removeAttribute("id");
                for (let { name, value } of node.attributes) {
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
                    const x = parseFloat(tspanNode.getAttribute("x"));
                    const y = parseFloat(tspanNode.getAttribute("y"));
                    tspanNode.removeAttribute("x");
                    tspanNode.removeAttribute("y");
                    newText.setAttribute("transform", `translate(${x},${y})`);
                    newText.setAttribute("id", newText.id + "-" + `${i}`);
                }
                textNode.parentNode.insertBefore(newText, textNode);
            }
        }
        textNode = textNode.parentNode.removeChild(textNode);
    }

    // Replace polylines by "path" because they morph better
    if (nodeType === Node.ELEMENT_NODE && (tagName === "polyline" || tagName === "polygon")) {
        const points = node.getAttribute("points");
        node.removeAttribute("points");
        const path = document.createElement("path");
        for (let { name, value } of node.attributes) {
            path.setAttribute(name, value);
        }
        const xy = points.split(" ");
        const xx = xy.filter((_, i) => i % 2 === 0);
        const yy = xy.filter((_, i) => i % 2 === 1);
        let d = `M${xx[0]} ${yy[0]}`;
        for (let i = 1; i < xx.length; ++i) {
            d += ` L${xx[i]} ${yy[i]}`;
        }
        if (tagName === "polygon") {
            d += "Z";
        }

        path.setAttribute("d", d);
        node.parentNode.insertBefore(path, node);
        node.parentNode.removeChild(node);
    }

    // Delete inline images, because they make the file too big
    if (
        nodeType === Node.ELEMENT_NODE &&
        tagName === "image" &&
        node.getAttribute("xlink:href").slice(0, 5) === "data:"
    ) {
        const content = node.getAttribute("xlink:href");
        const hexhash = md5(content);
        const dataIdx = content.indexOf(",") + 1;
        const slashIdx = content.indexOf("/");
        const semicolonIdx = content.indexOf(";");
        const extension = content.slice(slashIdx + 1, semicolonIdx);
        const cacheFilename = path.join(cacheDir, `${hexhash}.${extension}`);
        const fileExists = await stat(cacheFilename).catch((err) => false);
        if (!fileExists) {
            await mkdir(cacheDir, { recursive: true }).catch((err) => true);
            await writeFile(
                cacheFilename,
                Buffer.from(Latin1.stringify(Base64.parse(content.slice(dataIdx))), "latin1")
            );
        }
        const depId = assets[0].addDependency({
            specifier: cacheFilename,
            specifierType: "url",
        });
        node.removeAttribute("xlink:href");
        node.setAttribute("href", depId);
    }

    [...node.childNodes].forEach((child) => processNode(child, assets, root, idStack));
}

function removeDuplicateIds(domNode) {
    const counts = {};
    for (let node of domNode.querySelectorAll("[id]")) {
        var currentId = node.id ? node.id : "undefined";
        if (counts[currentId] == null) {
            counts[currentId] = 0;
        }
        if (!node.hasAttribute("move")) {
            counts[currentId]++;
        }
    }
    for (let node of domNode.querySelectorAll("[id]")) {
        var currentId = node.id ? node.id : "undefined";
        if (counts[currentId] > 1) {
            node.removeAttribute("id");
        }
    }
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
        node.setAttribute(
            attribute,
            parseFloat(node.getAttribute("opacity") || 1.0) * parseFloat(value || 1.0)
        );
    } else if (["fill", "full-rule", "stroke", "stroke-width"].includes(attribute)) {
        if (!node.hasAttribute(attribute)) {
            node.setAttribute(attribute, value);
        }
    } else if (attribute === "x" || attribute === "y") {
        let newValue = parseFloat(value) || 0.0;
        if (node.hasAttribute(attribute)) {
            newValue += parseFloat(node.getAttribute(attribute)) || 0.0;
        }
        node.setAttribute(attribute, newValue);
    } else if (!node.hasAttribute(attribute)) {
        node.setAttribute(attribute, value);
    }
}

function md5(data) {
    return crypto.createHash("md5").update(data).digest("hex");
}
