# SVG Slides

Slide crafting utility for nerds.

Draw your slides in a vector editor and export SVG.
By annotating the SVG, you can build slide transitions with

-   Incremental builds
-   Magic-move / morph with precise slide-to-slide matching by object ID.
-   Fade-in and out.
-   Custom external web content like videos or interactive widgets.

**Note**: Expect this to be more work than Powerpoint or Keynote, but more rewarding :)

## Prerequisites

-   Install Python 3
-   `pip install -r requirements.txt`
-   Install [Node.js](https://nodejs.org/en/) with NPM.
-   We use [Parcel](https://parceljs.org/) for building the project. (`npm install -g parcel-bundler`)

## Process

-   Fork this repo (optional, allows customization)

-   Draw your slides (of size `1280x720`) in your favourite vector editor I use [Sketch](https://www.sketch.com/) on Mac. Cross-platform, [Figma](https://www.figma.com/file/Xmk7YqeZUriwRdOrTxBCj3/svg-slides-demo?node-id=0%3A1) seems to work well. For Figma, make sure to enable 'include "id" attribute' in SVG export settings.

-   Annotate your SVG IDs with attributes to set animation behavior, e.g. `myPath[stage=2][fade-in]` or `rectangle[move][otherattrib=value]`
    <br>Looks like this in [Sketch](https://www.sketch.com/):<br>
    <img src="./docs/sketch-screenshot.png" width="300px" />

-   Run `./preprocess_slides.py demo-data/ -m demo-data/dist -o demo-data/slides.json` to pre-process your SVGs (parse these annotated ids) and turn them into one big JSON file.
    This also strips out embedded images and puts them in `dist/media/`.

-   You can customize the presenter notes in `demo-data/notes.md`.
    You can find the right numbers to link notes with slides in the cockpit (press `C` to open)

-   Run `parcel index.html` in `demo-data/` to serve your slides in dev-mode.

-   The entry-point for the code is `demo-data/index.js`.

## Sketch live view

If you are using Sketch, we provide a watcher script to automatically extract the SVG and build the `slides.json` file everytime you save the Sketch file.
You need to name your Sketch file `slides.sketch` and give the containing directory as argument:

```
./sketch-generate.sh demo-data/
```

## Step-wise appearance of nodes

-   Use tags like `[stage=1]` or `[stage=3-5]` in your IDs.

## Entry animation

-   `mynode[fade-in]`
-   `mynode[fade-in=2]` --- fade in, taking 2 seconds
-   `mynode[fade-in=0.5,1]` --- fade in, taking 500ms, aligning this at the end of the transition if other transitions take longer
-   `mynode[draw-line]` --- for paths, draw them from start to finish
-   `mynode[fade-down]` --- fade in and come 20pix down
-   `mynode[appear-along=PathId,5,0]` --- appear along a given path object, take 5 seconds, align at the begining of the transition

## Transitioning objects from one stage to the next

-   `mynode[move=1.5]` --- 1.5 second morph .. could be color, position, rotation, ... will be morphed

## Exit animation

-   `mynode[fade-out=1]` --- 1 second fade out

## External content

-   `rect[youtube=55bjCP9Fy5I]` will embed a YT video

## Shortcuts

-   `?` --- open shortcut overview
-   `Left`, `Right`, `Up`, `Down`, `[`, `]` --- stage navigation
-   `Shift + Left` etc. --- navigation, skipping incremental builds
-   `Home`, `End` --- go to start or beginning
-   `G 10 G` -- go to slide number 10
-   `F` --- go full screen
-   `C` --- open the cockpit (presenter view). _move this to a separate window_
-   `T` --- start/stop the timer (visible in presenter view)
-   `R` --- reset the timer to zero
-   `B` --- toggle blacking out the slide
