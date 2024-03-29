<br><img src="logo.svg" width="200" alt="SlideKit logo" style="margin:1em 0">

SlideKit is a highly scriptable player for slides defined in the SVG format.
You can draw those slides in any vector drawing program, and annotate the objects with custom attributes that trigger transitions, incremental builds, or scripts. SlideKit suppports

-   Incremental builds
-   Magic-move, with matching by ID, and morphing of many attributes, including path shape.
-   Fade-in and -out
-   Presenter notes
-   External web content (interactive plots, iframes, YouTube videos)
-   Scripted animations (write your own plugins & transitions)
-   Print to PDF (in Chrome)


https://user-images.githubusercontent.com/840825/159301945-66b53409-58a0-4c87-be25-a63fce87f71c.mp4



## Minimal example

-   [Sketch template](https://github.com/tvogels/slidekit-example-sketch)

## Editor

You can create SVG slides in any vector-drawing editor.
For the best experience, we recommend [Sketch](https://www.sketch.com/home/) on macOS.
On other platforms, we recommend the free web-based [Figma](https://www.figma.com).

## SVG features

You can add attributes to any SVG element

-   **Step-wise appearance:** use tags `[stage=1]` or `[stage=3-5]`
-   **Magic move** `mynode[move=1.5]` --- 1.5 second morph. Interpolates be color, position, rotation, etc. Supports complex paths.

Entry effects:

-   `mynode[fade-in]`
-   `mynode[fade-in=2]` --- fade in, taking 2 seconds
-   `mynode[fade-in=0.5,1]` --- fade in, taking 500ms, aligning this at the end of the transition if other transitions take longer
-   `mynode[draw-line]` --- for paths, draw them from start to finish
-   `mynode[fade-down]` --- fade in and come 20pix down
-   `mynode[appear-along=PathId,5,0]` --- appear along a given path object, take 5 seconds, align at the begining of the transition
-   [complete list](https://github.com/tvogels/slidekit/blob/master/packages/slidekit/src/transitions/index.ts#L10-L14)

Exit effects:

-   `mynode[fade-out=1]` --- 1 second fade out

External content:

-   `rect[youtube=55bjCP9Fy5I]` will embed a YT video
-   iframes
-   embed video
-   [complete list](https://github.com/tvogels/slidekit/blob/master/packages/slidekit/src/preprocessors/index.ts)

Scripted animation / WebGL:

See [packages/example](./packages/example/molecule/index.js) for an animated 3D molecule with WebGL.

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
