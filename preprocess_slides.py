#!/usr/bin/env python3

"""
Run this script on a directory of SVD files
to preprocess them and create one JSON that contains all your slides.
"""

import base64
import hashlib
import json
import os
import xml.dom
from argparse import ArgumentParser
from xml.dom.minidom import parse

from parsley import makeGrammar
from tqdm import tqdm


def main():
    parser = ArgumentParser()
    parser.add_argument("slides", nargs="+")
    parser.add_argument("--output", "-o", default="slides.json")
    parser.add_argument("--media-out-dir", "-m", default="dist")
    args = parser.parse_args()

    strings = []

    # We will go through all slides and
    # do a couple of modifications that makes the SVGs easier to work with
    #   for example, we inline 'use' statements
    #   and remove embedded images by paths to 'media/'

    progress_bar = tqdm(enumerate(sorted(args.slides)), desc="Processing slides", unit=" slides")
    for slide_no, slide_path in progress_bar:
        progress_bar.set_postfix_str(slide_path)
        doc = parse(slide_path)

        process_node(doc, slide_no, root=doc, media_out_dir=args.media_out_dir)
        strings.append(doc.toxml())

    with open(args.output, "w") as fp:
        json.dump(strings, fp)

    print(f"Output written to {args.output}")


ID_GRAMMAR = makeGrammar(
    """
id_char = anything:x ?(x not in '[]') -> x
id = id_char+:string -> "".join(string)
value_string = id
attribute_key = (<letterOrDigit> | '-')+:string -> "".join(string)
attribute_value = '=' value_string:value -> value
attribute = '[' attribute_key:key attribute_value?:value ']' -> (key, value)
syntax = id?:id attribute*:attributes -> {'id': id, 'attributes': attributes}
""",
    {},
)


def process_node(node, slide, root, media_out_dir, id_stack=[]):
    # Parse the ID syntax     anythingblabla[attrkey=attrval][attrkey=attrval]
    if not node.nodeType in [
        xml.dom.Node.TEXT_NODE,
        xml.dom.Node.COMMENT_NODE,
        xml.dom.Node.DOCUMENT_NODE,
    ]:
        id_attr = node.getAttribute("id")
        if id_attr is not None and id_attr != "":
            parsed = ID_GRAMMAR(id_attr).syntax()

            if parsed["id"] is not None:
                node.setAttribute("id", parsed["id"])
            else:
                node.setAttribute("id", "")

            for (key, value) in parsed["attributes"]:
                if value is None:
                    value = ""
                node.setAttribute(key, value)

        if node.getAttribute("move") == "true":
            id_stack = id_stack + [node.getAttribute("id")]
            node.setAttribute("id", "-".join(id_stack))

    # Remove some <g> tags and more their children up in the hierarchy
    # | To make transitioning of objects more reliable, we remove as many group tags that are
    # | not meaningful for transitions.
    # | Any group that is not moving from one slide to the next can be deleted from the DOM hierarchy.
    if node.nodeType == 1 and node.tagName == "g" and group_element_should_be_removed(node):
        parent = node.parentNode
        for child in list(node.childNodes):
            # print("it has child", child)
            child = node.removeChild(child)
            child = parent.insertBefore(child, node)
            for attr in node.attributes.keys():
                apply_attr_to_groups_child(child, attr, node.getAttribute(attr))
            process_node(child, slide, root, media_out_dir, id_stack=id_stack)
        node = parent.removeChild(node)
        node.unlink()
        return

    # Inline 'use' statements
    # This makes it easier to transition elements form one page to the next
    # without worrying about breaking references.
    if node.nodeType == 1 and node.tagName == "use":
        defs = root.getElementsByTagName("defs")[0]
        ref_id = node.getAttribute("xlink:href")[1:]
        parent = node.parentNode
        for candidate in list(defs.childNodes):
            if candidate.nodeType == 1 and candidate.getAttribute("id") == ref_id:
                definition = candidate.cloneNode(True)
                definition.removeAttribute("id")
                for attribute in node.attributes.keys():
                    if attribute != "xlink:href":
                        definition.setAttribute(attribute, node.getAttribute(attribute))
                parent.insertBefore(definition, node)
                node = parent.removeChild(node)
                node.unlink()
                break

    # Deal with <tspan>'s
    # | Tspans don't support CSS transitions, so if a text entry has multiple tspan children,
    # | we break them apart to their own <text> parent.
    if node.nodeType == 1 and node.tagName == "text" and "move" in node.attributes:
        textNode = node
        i = 0
        for child in list(textNode.childNodes):
            if child.nodeType == 1 and child.tagName == "tspan":
                i += 1
                tspanNode = child
                # create a new dom Element
                newText = node.cloneNode(False)
                tspanNode = textNode.removeChild(tspanNode)
                newText.appendChild(tspanNode)
                if "x" in tspanNode.attributes and "y" in tspanNode.attributes:
                    x = float(tspanNode.getAttribute("x"))
                    y = float(tspanNode.getAttribute("y"))
                    tspanNode.removeAttribute("x")
                    tspanNode.removeAttribute("y")
                    newText.setAttribute("transform", f"translate({x},{y})")
                    newText.setAttribute("id", newText.getAttribute("id") + "-" + str(i))
                textNode.parentNode.insertBefore(newText, textNode)
        textNode = textNode.parentNode.removeChild(textNode)
        textNode.unlink()

    # Replace polylines by "path" because they morph better
    if node.nodeType == 1 and node.tagName == "polyline":
        points = node.getAttribute("points")
        node.tagName = "path"
        node.removeAttribute("points")
        xy = points.split(" ")
        xx = xy[::2]
        yy = xy[1::2]
        d = f"M{xx[0]} {yy[0]}"
        for x, y in zip(xx[1:], yy[1:]):
            d += f" L{x} {y}"
        # d += " Z"
        node.setAttribute("d", d)

    # Delete inline images, because they make the file too big
    if (
        node.nodeType == 1
        and node.tagName == "image"
        and node.getAttribute("xlink:href").startswith("data:")
    ):
        content = node.getAttribute("xlink:href")
        hash_object = hashlib.md5(content.encode("ascii"))
        hexhash = hash_object.hexdigest()
        data_start = content.index(",") + 1
        slash_idx = content.index("/")
        semicolon_idx = content.index(";")
        extension = content[slash_idx + 1 : semicolon_idx]
        filename = f"{hexhash}.{extension}"
        filepath = os.path.join(media_out_dir, "media", filename)
        os.makedirs(media_out_dir, exist_ok=True)
        if not os.path.isfile(filepath):
            with open(filepath, "wb") as fp:
                fp.write(base64.b64decode(content[data_start:]))
        node.removeAttribute("xlink:href")
        node.setAttribute("href", os.path.join("media", filename))

    for child in node.childNodes:
        process_node(child, slide, root, media_out_dir, id_stack=id_stack)


def group_element_should_be_removed(node):
    """
    To make transitioning of objects more reliable, we remove as many group tags that are
    not meaningful for transitions.
    Any group that is not moving from one slide to the next can be deleted from the DOM hierarchy.
    """
    return "move" not in node.attributes


def apply_attr_to_groups_child(node, attribute, value):
    """
    This is used when a DOM node <g> is removed, and its children are moved
    one step up in the hierarchy.
    It's children need to inherit some of the parent's properties.
    """
    if node.nodeType != 1:
        return
    if attribute == "id":
        return
    elif attribute == "transform":
        newValue = value + " " + node.getAttribute("transform").strip()
        node.setAttribute("transform", newValue)
    elif attribute == "opacity":
        newValue = float(value)
        if "opacity" in node.attributes:
            newValue *= float(node.getAttribute("opacity"))
        node.setAttribute("opacity", str(newValue))
    elif attribute in ["x", "y"]:
        newValue = float(value)
        if attribute in node.attributes:
            newValue += float(node.getAttribute(attribute))
        node.setAttribute(attribute, str(newValue))
    else:
        if not attribute in node.attributes:
            node.setAttribute(attribute, value)


if __name__ == "__main__":
    main()
