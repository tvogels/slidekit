#!/usr/bin/env python3

"""
This script fills in gaps in sequences of images.
You can use this when rendering videos.
"""

import glob
import shutil
import re

frame_dict = {}

max_frame = 0

for file in glob.glob("frame*.png"):
    out = re.match(r"""frame(\d+).png""", file)
    frameno = int(out[1])
    frame_dict[frameno] = file
    max_frame = max(max_frame, frameno)

prev_match = 0
for f in range(max_frame):
    if f in frame_dict:
        prev_match = f
    else:
        outfile = f"frame{f:06d}.png"
        print("Writing", outfile)
        shutil.copyfile(frame_dict[prev_match], outfile)
