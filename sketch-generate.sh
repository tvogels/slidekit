#!/bin/bash

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 slides_directory/"
    exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# generate data_dir path_to_preprocess_slides.py
function generate {
    rm -rf "$1/*.svg"
    sketchtool export artboards --formats=svg --output="$1" "$1/slides.sketch"
    $2 --output "$1/slides.json" --media-out-dir "$1/dist" "$1"
}

export -f generate

directory="$1"
svg_file="${directory}/slides.sketch"
echo "Watching update of file ${svg_file}..."
fswatch -o "$svg_file" | xargs -n1 -I{} bash -c "generate '$directory' '$SCRIPT_DIR/preprocess_slides.py'"
