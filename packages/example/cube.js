import { BoxGeometry, WebGLRenderer, Scene, MeshStandardMaterial, Mesh, PerspectiveCamera, PointLight, AmbientLight, MeshBasicMaterial } from 'three';

export default ({ canvas, height, width, node }) => {
    const scene = new Scene();

    const renderer = new WebGLRenderer();
    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    renderer.domElement.style.zIndex = 1;
    renderer.domElement.style.position = "absolute";
    canvas.appendChild(renderer.domElement);

    const camera = new PerspectiveCamera(20, width / height, 0.1, 1000);
    camera.position.z = 5;

    const cube = new Mesh(
        new BoxGeometry(), 
        new MeshStandardMaterial({ color: node.getAttribute("color") || "hotpink" })
    );
    scene.add(cube);
    
    const light = new PointLight(0x404040, 2, 100);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new AmbientLight(0x404040, 1));

    return {
        time: 0,
        tick(t) {
            cube.rotation.x = .6 + t;
            cube.rotation.y = .6 + t;
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
            camera.aspect = width/ height;
            camera.updateProjectionMatrix();
        },
        minimumDuration() {
            return 1;
        }
    }
};
