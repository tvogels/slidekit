#!/bin/bash

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 slides_directory/"
    exit 1
fi

function generate {
    rm -rf "$1/*.svg"
    sketchtool export artboards --formats=svg --output="$1" "$1/slides.sketch"
    ./preprocess_slides.py --output "$1/slides.json" --media-out-dir "$1/dist" "$1"
}

export -f generate

directory="$1"
svg_file="${directory}/slides.sketch"
echo "Watching update of file ${svg_file}..."
fswatch -o "$svg_file" | xargs -n1 -I{} bash -c "generate '$directory'"
