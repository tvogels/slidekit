# SVG Slides

Slide crafting utility for nerds.

- Expect this to be more work than PowerPoint or KeyNote
- Use this if you want absolute control over slide transitions.<br>
  This basically supports magic move while you are in control over linking objects between slides.

## Process

- You make slides in your favourite vector editor (I use Sketch on Mac)
- Annotate ids with attributes, e.g. `myPath[transition=fade-in]` or `rectangle[move=true][otherattrib=value]` (to enable magic move to the next or previous slide)
- Run `./process_svgs.py` to pre-process your SVGs (parse these annotated ids) and turn them into one big JSON file. This also does things like stripping out embedded images and puting them in `/media/`
- Run `parcel index.html` to serve your slides.

## Supported attributes

- `stage=3`, only appear in the 3rd stage of the slide
- `transition=fade-in`
- `transition=fade-out`
- `transition=draw-line`, for paths, draw them from start to finish
- `move=true`, enable magic move for this object
- `transition-duration=0.5` seconds
- `transition-alignment=0.0` between 0 and 1. where to start this transition if the total slide transition is longer
- `appear-along=PathId`,
- `youtube=55bjCP9Fy5I` on a `rect` will embed a YT video
