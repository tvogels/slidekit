import { Transformer } from "@parcel/plugin";
import SketchFile from "./sketchfile";
import path from "path";
import { mkdir, stat } from "fs/promises";

export default new Transformer({
    async transform({ asset }) {
        const filePath = path.parse(asset.filePath);
        const cacheDir = path.join(filePath.dir, "." + filePath.base + "-cache");
        if (!(await stat(cacheDir).catch((e) => false))) {
            await mkdir(cacheDir);
        }

        const sketchFile = new SketchFile(asset.filePath, cacheDir);

        const artboards = sketchFile.artboards();
        await sketchFile.pruneCache(artboards);

        // Assert that the page names are all unique
        const usedNames = new Set();
        for (let layer of artboards) {
            if (usedNames.has(layer.name)) {
                throw new Error(`Page name “${layer.name}” is not unique.`);
            } else {
                usedNames.add(layer.name);
            }
        }

        const assets = [asset];

        let deps = [];

        let i = 0;
        for (let layer of artboards) {
            i++;
            const key = `${asset.id}-${filePath.base.replace(/ /g, "").replace(".svg", "")}`;
            assets.push({
                type: "svg",
                content: await layer.getSvg(),
                uniqueKey: key,
            });
            asset.addDependency({ specifier: key, specifierType: "esm" });
            deps.push({
                name: `slide${i}`,
                key,
                filename: filePath.base,
            });
        }

        let code = deps.map(({ name, key }) => `import ${name} from "${key}";\n`).join("");

        code += `export default {${deps
            .map(({ name, filename }) => `  ${JSON.stringify(filename)}: ${name}`)
            .join(",\n")}}`;

        asset.type = "js";
        asset.setCode(code);
        asset.setMap();

        return assets;
    },
});
