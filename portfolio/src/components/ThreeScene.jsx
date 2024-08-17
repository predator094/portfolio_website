import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

const Bot = () => {
	const modelRef = useRef(null);
	const objectRefs = useRef([]);
	const labRef = useRef(null);
	const intersectedObjects = useRef([]);
	const raycaster = new THREE.Raycaster();

	useEffect(() => {
		let scene, renderer, camera, mixer, clock;
		let model, currentAction;
		let isWalking = false;
		const container = document.getElementById("container");
		const moveSpeed = 2;
		const safetyMargin = 10;

		const rotationSpeed = 0.05; // Rotation speed
		let targetRotationY = 0; // Target rotation

		const baseActions = {
			idle: { weight: 1 },
			walk: { weight: 0 },
		};

		const allActions = [];
		let delta = 0;

		function init() {
			clock = new THREE.Clock();
			scene = new THREE.Scene();
			scene.background = new THREE.Color(0xa0a0a0);
			scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

			// Add lighting
			const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
			hemiLight.position.set(0, 20, 0);
			scene.add(hemiLight);

			const pointLight = new THREE.PointLight(0xffffff, 1, 100);
			pointLight.position.set(5, 10, 7.5);
			scene.add(pointLight);

			// Create ground mesh
			const mesh = new THREE.Mesh(
				new THREE.PlaneGeometry(1000, 1000),
				new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
			);
			mesh.rotation.x = -Math.PI / 2;
			mesh.receiveShadow = true;
			scene.add(mesh);

			// Load font and add text
			const fontLoader = new FontLoader();
			fontLoader.load("helvetiker_bold.typeface.json", (font) => {
				const textGeometry = new TextGeometry(
					"Hello World\n made by Anshul Yadav",
					{
						font: font,
						size: 0.1,
						depth: 0.01,
						curveSegments: 12,
						bevelEnabled: false,
						bevelThickness: 1,
						bevelSize: 0.0001,
						bevelOffset: 0,
						bevelSegments: 3,
					}
				);

				const textMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
				const textMesh = new THREE.Mesh(textGeometry, textMaterial);
				textMesh.position.set(0, 0.2, 0);
				textMesh.rotation.x = -Math.PI / 2;
				textMesh.castShadow = true;
				textMesh.receiveShadow = true;
				scene.add(textMesh);

				objectRefs.current.push(textMesh);
			});

			const loader = new GLTFLoader();
			loader.load("models/gltf/Xbot.glb", (gltf) => {
				model = gltf.scene;
				model.position.y = 0.1;
				scene.add(model);

				model.traverse((object) => {
					if (object.isMesh) {
						object.castShadow = true;
						object.receiveShadow = true;
					}
				});

				mixer = new THREE.AnimationMixer(model);
				gltf.animations.forEach((clip) => {
					const action = mixer.clipAction(clip);
					if (baseActions[clip.name]) {
						baseActions[clip.name].action = action;
						allActions.push(action);
					}
				});

				currentAction = baseActions.idle.action;
				currentAction.play();
				modelRef.current = model;
				animate();
			});

			loader.load("models/gltf/sci-fi_lab.glb", (gltf) => {
				const lab = gltf.scene;
				lab.position.set(0, 0, 0);

				lab.traverse((object) => {
					if (object.isMesh) {
						object.castShadow = true;
						object.receiveShadow = true;

						if (object.material.map) {
							object.material.map.needsUpdate = true;
						}

						object.material.needsUpdate = true;
						intersectedObjects.current.push(object);
					}
				});

				labRef.current = lab;
				scene.add(lab);
			});

			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.PCFSoftShadowMap;
			container.appendChild(renderer.domElement);

			camera = new THREE.PerspectiveCamera(
				45,
				window.innerWidth / window.innerHeight,
				1,
				100
			);
			camera.position.set(0, 2, 3);

			const controls = new OrbitControls(camera, renderer.domElement);
			controls.enablePan = false;
			controls.enableZoom = false;
			controls.enableRotate = true;
			controls.target.set(0, 1, 0);
			controls.update();

			window.addEventListener("resize", onWindowResize);

			// Event listeners for keydown and keyup
			window.addEventListener("keydown", handleKeyDown);
			window.addEventListener("keyup", handleKeyUp);
		}

		function handleKeyDown(event) {
			if (event.code === "ArrowUp" || event.code === "KeyW") {
				if (!isWalking) {
					switchAction(baseActions.walk.action);
					isWalking = true;
				}
			} else if (event.code === "ArrowLeft" || event.code === "KeyA") {
				targetRotationY -= Math.PI / 2; // Set the target rotation
			} else if (event.code === "ArrowRight" || event.code === "KeyD") {
				targetRotationY += Math.PI / 2; // Set the target rotation
			}
		}

		function handleKeyUp(event) {
			if (event.code === "ArrowUp" || event.code === "KeyW") {
				switchAction(baseActions.idle.action);
				isWalking = false;
			}
		}

		function switchAction(nextAction) {
			if (currentAction !== nextAction) {
				currentAction.fadeOut(0.2);
				currentAction = nextAction;
				currentAction.reset().fadeIn(0.2).play();
			}
		}

		function moveForward(delta) {
			if (model) {
				model.position.z -= moveSpeed * delta;
				checkIntersections();
			}
		}

		function checkIntersections() {
			if (model) {
				raycaster.update();
				const intersects = raycaster.intersectObjects(
					intersectedObjects.current
				);
				intersects.forEach((intersect) => {
					if (intersect.object) {
						intersect.object.material.color.set(0xff0000); // Change color to red
					}
				});
			}
		}

		function animate() {
			delta = clock.getDelta();
			mixer.update(delta);

			if (isWalking) {
				moveForward(delta);
			}

			// Smoothly rotate the model
			if (model) {
				const rotationDifference = targetRotationY - model.rotation.y;
				if (Math.abs(rotationDifference) > rotationSpeed) {
					model.rotation.y += Math.sign(rotationDifference) * rotationSpeed;
				} else {
					model.rotation.y = targetRotationY; // Snap to target rotation if close enough
				}
			}

			checkIntersections();
			renderer.render(scene, camera);
			requestAnimationFrame(animate);
		}

		function onWindowResize() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}

		init();

		return () => {
			window.removeEventListener("resize", onWindowResize);
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			container.removeChild(renderer.domElement);
			renderer.dispose();
			scene.clear();
		};
	}, []);

	return <div id="container" style={{ width: "100%", height: "100vh" }} />;
};

export default Bot;
