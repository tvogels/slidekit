import argparse
import copy
import pathlib
import shutil
import subprocess
import time
import xml.dom
import xml.etree.ElementTree as ElementTree
from xml.dom.minidom import parse

import tqdm
from parsley import makeGrammar
from watchdog.events import FileModifiedEvent, FileSystemEventHandler
from watchdog.observers import Observer


def get_parser():
    parser = argparse.ArgumentParser()
    # fmt: off
    parser.add_argument("sketch_file", help="Sketch containing the slides")
    parser.add_argument("--no_build_stage", default=False, action="store_true", help="Disable slides transitions")
    parser.add_argument("--no_cleanup", default=False, action="store_true", help="Disable tmp files cleanup for debugging")
    parser.add_argument("--watch", "-w", action="store_true", default=False, help="Watch changes of sketch_file and auto-rebuild.")
    # fmt: on
    return parser


def main():
    check_dependencies()
    parser = get_parser()
    args = parser.parse_args()

    build_slides(args)

    if args.watch:
        sketch_file = pathlib.Path(args.sketch_file)
        observer = Observer()
        handler = WatchHandler(lambda: build_slides(args), sketch_file.name)
        observer.schedule(
            handler,
            path=sketch_file.parent,
            recursive=False,
        )
        observer.start()
        try:
            print(f"Watching changes in {args.sketch_file}...")
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
        observer.join()


def build_slides(args):
    sketch_file = pathlib.Path(args.sketch_file)
    slides_directory = sketch_file.parent / "tmp"
    slides_directory.mkdir(exist_ok=True)
    processed_directory = slides_directory / "processed"
    processed_directory.mkdir(exist_ok=True)

    print("Generate SVG files")
    subprocess.run(["sketchtool", "export", "artboards", "--formats=svg", sketch_file, f"--output={slides_directory}"])

    print("Process SVG files")
    files = sorted(list(slides_directory.glob("*.svg")))

    ElementTree.register_namespace("", "http://www.w3.org/2000/svg")

    # We will go through all slides and
    # do a couple of modifications that makes the SVGs easier to work with

    progress_bar = tqdm.tqdm(enumerate(files), desc="Processing slides", unit=" slides")
    for slide_no, slide_path in progress_bar:
        progress_bar.set_postfix_str(slide_path)
        slide_name = slide_path.with_suffix("").name
        doc = parse(str(slide_path))

        process_node(doc, slide_no, root=doc)

        # Extract the stages of the slide build
        tree = ElementTree.fromstring(doc.toxml())
        all_stages = [0]
        for staged_element in tree.findall(".//*[@stage]"):
            for stage in staged_element.attrib["stage"].split("-"):
                all_stages.append(int(stage))
        all_stages = sorted(list(set(all_stages)))

        if args.no_build_stage:
            ElementTree.ElementTree(tree).write(processed_directory / f"{slide_name}.svg")
        else:
            # Create new SVG file for each stage.
            for stage in all_stages:
                stage_doc = copy.deepcopy(tree)
                filter_stage(stage_doc, stage)
                ElementTree.ElementTree(stage_doc).write(processed_directory / f"{slide_name}_{stage:04}.svg")

    # Merge all SVG file stages into one PDF
    pdf_file = sketch_file.with_suffix(".pdf")
    print(f"Create PDF in {pdf_file}")
    all_files = sorted(list(map(str, processed_directory.glob("*.svg"))))
    subprocess.run(["rsvg-convert", "-f", "pdf", "-o", str(pdf_file)] + all_files)

    if not args.no_cleanup:
        print("Clean up")
        shutil.rmtree(slides_directory)


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


def process_node(node, slide, root, id_stack=[]):
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

    for child in node.childNodes:
        process_node(child, slide, root, id_stack=id_stack)


def filter_stage(node, current_stage: int):
    """Keep nodes should be displayed during `current_stage`."""
    node_to_remove = []
    for child in node:
        child_stage = child.attrib.get("stage")
        keep_child = True
        if child_stage is not None:
            if "-" in child_stage:
                from_, to_ = map(int, child_stage.split("-"))
                if current_stage < from_ or current_stage >= to_:
                    keep_child = False
            else:
                if current_stage < int(child_stage):
                    keep_child = False

        if not keep_child:
            node_to_remove.append(child)
        else:
            # Recurse on children
            filter_stage(child, current_stage)

    # Remove the nodes that are not at the current stage (cannot be done inside the for loop).
    for e in node_to_remove:
        node.remove(e)


def check_dependencies():
    try:
        subprocess.run(["sketchtool", "--help"], check=True, capture_output=True)
        subprocess.run(["rsvg-convert", "--help"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Please install sketchtool and rsvg-convert (brew install librsvg).")
        exit(1)


class WatchHandler(FileSystemEventHandler):
    def __init__(self, function, filename):
        self.function = function
        self.filename = filename
        super().__init__()

    def dispatch(self, event):
        if isinstance(event, FileModifiedEvent) and event.src_path.endswith(self.filename):
            print(f"\n\nDetected change in {event.src_path}. Re-building slides.\n")
            self.function()
            print()
        return super().dispatch(event)


if __name__ == "__main__":
    main()
