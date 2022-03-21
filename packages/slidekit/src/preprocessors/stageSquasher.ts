/**
 * Preprocessor that removes not existing build stages of the slides.
 * This allows to create animation with large numbering gaps to ease the insertion
 * of animation stages without renumbering all the steps. The following SVG elements
 * [stage=10-20]
 * [stage=15-30]
 * [stage=-19]
 * [stage=30]
 * would be remapped to
 * [stage=1-4]
 * [stage=2-5]
 * [stage=-3]
 * [stage=5]
 */
export default function (domNode: HTMLElement) {
    // Find all existing stages in the slide
    const allStages = [0.]
    for (let node of domNode.querySelectorAll("[stage]")) {
        const stage = node.getAttribute("stage");
        if (stage.includes("-")) {
            const [from, to] = stage.split("-");
            const min = parseFloat(from || "0");
            allStages.push(min);
            if (to) {
                allStages.push(parseFloat(to));
            }
        } else {
            allStages.push(parseFloat(stage));
        }
    }

    // Create the mapping to renumber the stages removing the gaps
    const uniqueStages = [...new Set(allStages)];
    const sortedStages = uniqueStages.sort((a, b) => a - b);
    const mapping = {};
    for (const [index, stage] of sortedStages.entries()) {
        mapping[stage.toString()] = index.toString();
    }
    mapping[""] = "";

    // Overwrite stage numbers
    for (let node of domNode.querySelectorAll("[stage]")) {
        const stage = node.getAttribute("stage");
        if (stage.includes("-")) {
            const [from, to] = stage.split("-");
            node.setAttribute("stage", `${mapping[from]}-${mapping[to]}`);
        } else {
            node.setAttribute("stage", mapping[stage]);
        }
    }
}
