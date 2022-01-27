import { Transformer } from '@parcel/plugin';

import { exec } from "child_process";
import { mkdtemp, writeFile, readdir, readFile } from "fs/promises";
import { join } from "path";
import { promisify } from "util";


export default (new Transformer({
    async transform({ asset }) {
        const tmpdir = await mkdtemp("/tmp/");

        await writeFile(join(tmpdir, "slides.sketch"), await asset.getBuffer());

        // sketchtool export artboards --formats=svg --output="$1" "$1/slides.sketch"

        const cmd = `sketchtool export artboards --formats=svg --output="${tmpdir}" "${join(tmpdir, "slides.sketch")}"`;

        const { stdout, stderr } = await promisify(exec)(cmd);

        const assets = [asset];

        let deps = [];

        let i = 0;
        for (let file of await readdir(tmpdir)) {
            if (file.endsWith(".svg")) {
                i++;
                const key = `${asset.id}-${file.replace(/ /g, "").replace(".svg", "")}`;
                assets.push({
                    type: 'svg',
                    content: await readFile(join(tmpdir, file)),
                    uniqueKey: key
                });
                asset.addDependency({specifier: key, specifierType: "esm"});
                deps.push({
                    name: `slide${i}`,
                    key,
                    filename: file,
                })
            }
        }

        let code = deps.map(({ name, key }) => `import ${name} from "${key}";\n`).join("");

        code += `export default {${deps.map(({ name, filename }) => `  ${JSON.stringify(filename)}: ${name}`).join(",\n")}}`;

        asset.type = "js";
        asset.setCode(code);
        asset.setMap();

        return assets;
    },
}));
