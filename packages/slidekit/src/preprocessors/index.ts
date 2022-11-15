import canvas from "./canvas";
import hyperlink from "./hyperlink";
import iframe from "./iframe";
import scale from "./scale";
import stageSquasher from "./stageSquasher";
import video from "./video";
import youtube from "./youtube";

export default {
    canvas,
    hyperlink,
    iframe,
    scale,
    stageSquasher,
    video,
    youtube,
};

export const defaultPreprocessors = [hyperlink, canvas, iframe, youtube, video];
