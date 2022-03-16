import { BoxGeometry, WebGLRenderer, Scene, Mesh, PerspectiveCamera, Color, DirectionalLight, Group, IcosahedronGeometry, Vector3, MeshPhongMaterial } from 'three';
import { PDBLoader } from './PDBLoader.js';
import pdbs from "./*.pdb"

const easeInOutQuad = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export default ({ canvas, height, width, node }) => {
    const loader = new PDBLoader();

    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    renderer.domElement.style.zIndex = 1;
    renderer.domElement.style.position = "absolute";
    canvas.appendChild(renderer.domElement);

    scene = new Scene();

    camera = new PerspectiveCamera(70, width / height, 1, 5000);
    camera.position.z = parseInt(node.getAttribute("distance") || "500");
    scene.add(camera);

    const light1 = new DirectionalLight(0xffffff, 0.8);
    light1.position.set(1, 1, 1);
    scene.add(light1);

    const offset = new Vector3();

    const light2 = new DirectionalLight(0xffffff, 0.5);
    light2.position.set(- 1, - 1, 1);
    scene.add(light2);

    root = new Group();
    scene.add(root);

    let object;

    loader.load(pdbs[node.getAttribute("molecule") || "caffeine"], function (pdb) {
        const geometryAtoms = pdb.geometryAtoms;
        const geometryBonds = pdb.geometryBonds;

        const boxGeometry = new BoxGeometry(1, 1, 1);
        const sphereGeometry = new IcosahedronGeometry(1, 3);

        geometryAtoms.computeBoundingBox();
        geometryAtoms.boundingBox.getCenter(offset).negate();

        geometryAtoms.translate(offset.x, offset.y, offset.z);
        geometryBonds.translate(offset.x, offset.y, offset.z);

        let positions = geometryAtoms.getAttribute('position');
        const colors = geometryAtoms.getAttribute('color');

        const position = new Vector3();
        const color = new Color();

        for (let i = 0; i < positions.count; i++) {

            position.x = positions.getX(i);
            position.y = positions.getY(i);
            position.z = positions.getZ(i);

            color.r = colors.getX(i);
            color.g = colors.getY(i);
            color.b = colors.getZ(i);

            const material = new MeshPhongMaterial({ color: color });

            const object = new Mesh(sphereGeometry, material);
            object.position.copy(position);
            object.position.multiplyScalar(75);
            object.scale.multiplyScalar(25);
            root.add(object);
        }

        positions = geometryBonds.getAttribute('position');

        const start = new Vector3();
        const end = new Vector3();

        for (let i = 0; i < positions.count; i += 2) {

            start.x = positions.getX(i);
            start.y = positions.getY(i);
            start.z = positions.getZ(i);

            end.x = positions.getX(i + 1);
            end.y = positions.getY(i + 1);
            end.z = positions.getZ(i + 1);

            start.multiplyScalar(75);
            end.multiplyScalar(75);

            object = new Mesh(boxGeometry, new MeshPhongMaterial(0xffffff));
            object.position.copy(start);
            object.position.lerp(end, 0.5);
            object.scale.set(5, 5, start.distanceTo(end));
            object.lookAt(end);
            root.add(object);
        }
    });

    return {
        time: 0,
        tick(t) {
            this.time = t;
            requestAnimationFrame(this.render.bind(this));
        },
        render() {
            if (object == null) {
                return requestAnimationFrame(this.render.bind(this));
            }
            const morphT = Math.floor(this.time) + easeInOutQuad(this.time % 1);
            root.rotation.set(
                0,
                0.5 * Math.PI * morphT,
                0
            );
            renderer.render(scene, camera);
        },
        deactivate() {
            renderer.clear();
        },
        setNode(node) {
            node.style.opacity = 0;

            renderer.domElement.style.top = `${node.getAttribute("y")}px`;
            renderer.domElement.style.left = `${node.getAttribute("x")}px`;
            const width = node.getAttribute("width");
            const height = node.getAttribute("height");
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        },
        minimumDuration() {
            return .5;
        }
    }
};
