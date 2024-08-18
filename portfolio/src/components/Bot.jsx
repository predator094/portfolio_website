import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";

const Bot = () => {
	const modelRef = useRef(null);
	const objectRefs = useRef([]);
	const labRef = useRef(null);
	const intersectedObjects = useRef([]);
	const raycaster = new THREE.Raycaster();
	const currentIntersectedObject = useRef(null);
	const hologramSprites = useRef([]);

	useEffect(() => {
		let scene, renderer, camera, mixer, clock;
		let model, currentAction;
		let isWalking = false;
		const container = document.getElementById("container");
		const moveSpeed = 2;
		const safetyMargin = 10;

		const baseActions = {
			idle: { weight: 1 },
			walk: { weight: 0 },
		};

		const allActions = [];
		let delta = 0;
		const rotationSpeed = 0.1; // Rotation speed
		let targetRotationY = 0; // Target rotation
		const hudMessage = document.getElementById("hud-message");
		const loadingScreen = document.getElementById("loading-screen");
		const totalModelsToLoad = 2; // Get the HUD message element
		let loadedModelsCount = 0;

		function init() {
			clock = new THREE.Clock();
			scene = new THREE.Scene();
			scene.background = new THREE.Color(0x000000);

			// Adding hemisphere light to the scene
			// const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
			// hemiLight.position.set(0, 20, 0);
			// scene.add(hemiLight);

			// Adding point light to the scene
			const pointLight1 = new THREE.PointLight(0xffffff, 30, 100);
			pointLight1.position.set(7, 4, -3);
			pointLight1.castShadow = true;
			pointLight1.shadow.mapSize.width = 256;
			pointLight1.shadow.mapSize.height = 256;
			pointLight1.shadow.camera.near = 0.5;
			pointLight1.shadow.camera.far = 50;

			// scene.add(pointLight1);

			const pointLight2 = new THREE.PointLight(0xffffff, 30, 100);
			pointLight2.position.set(1, 4, 0);
			pointLight2.castShadow = true;
			pointLight2.shadow.mapSize.width = 1024;
			pointLight2.shadow.mapSize.height = 1024;
			pointLight2.shadow.camera.near = 0.5;
			pointLight2.shadow.camera.far = 50;
			scene.add(pointLight2);

			// Creating ground mesh
			// const mesh = new THREE.Mesh(
			// 	new THREE.PlaneGeometry(1000, 1000),
			// 	new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
			// );
			// mesh.rotation.x = -Math.PI / 2;
			// mesh.receiveShadow = true;
			// scene.add(mesh);

			// Load font and add text to the ground
			function createtext(text, x, y, z, color) {
				const fontLoader = new FontLoader();
				fontLoader.load(
					"static/fonts/helvetiker_bold.typeface.json",
					(font) => {
						const textGeometry = new TextGeometry(text, {
							font: font,
							size: 0.1,
							depth: 0.01,
							curveSegments: 12,
							bevelEnabled: false,
							bevelThickness: 1,
							bevelSize: 0.0001,
							bevelOffset: 0,
							bevelSegments: 3,
						});

						const textMaterial = new THREE.MeshBasicMaterial({ color: color });
						const textMesh = new THREE.Mesh(textGeometry, textMaterial);
						textMesh.position.set(x - 0.25, y, z - 0.5);
						textMesh.rotation.x = -Math.PI / 2;
						textMesh.castShadow = false;
						textMesh.receiveShadow = false;

						scene.add(textMesh);
					}
				);
			}

			// Function to trigger a file download
			const downloadFile = () => {
				const link = document.createElement("a");
				link.href = "path/to/your/file.zip"; // Replace with your file path
				link.download = "file.zip"; // Replace with your desired file name
				link.click();
			};

			// Function to open a link in a new tab
			const openLink1 = () => {
				window.open("https://www.example.com", "_blank"); // Replace with your desired URL
			};

			const openLink2 = () => {
				window.open("https://www.example.com", "_blank"); // Replace with your desired URL
			};

			// Create hologram sprite
			function createHologramSprite(x, y, z, holo) {
				// Load hologram texture
				const textureLoader = new THREE.TextureLoader();
				const hologramTexture = textureLoader.load(holo); // Replace with your hologram image path
				const spriteMaterial = new THREE.SpriteMaterial({
					map: hologramTexture,
					transparent: true,
					opacity: 0.5,
					blending: THREE.AdditiveBlending,
				});
				const sprite = new THREE.Sprite(spriteMaterial);
				sprite.scale.set(1, 1, 1); // Adjust scale as needed
				sprite.position.set(x, y, z);
				sprite.visible = false; // Initially hidden
				scene.add(sprite);
				hologramSprites.current.push(sprite);
			}

			function createRectBoundary(
				x,
				y,
				z,
				width,
				height,
				color,
				action,
				holo,
				text
			) {
				const geometry = new THREE.PlaneGeometry(width, height);
				geometry.translate(0, 0.5 * height, 0); // Move the plane to center it on the origin

				// Convert plane geometry to edges geometry for wireframe
				const edges = new THREE.EdgesGeometry(geometry);

				const lineMaterial = new THREE.LineBasicMaterial({
					color: color,
					linewidth: 10, // Thickness of the line
				});
				const rectBoundary = new THREE.LineSegments(edges, lineMaterial);

				rectBoundary.position.set(x, y, z, holo);
				rectBoundary.rotation.x = -Math.PI / 2; // Flat on the ground
				scene.add(rectBoundary);
				objectRefs.current.push(rectBoundary);

				// Store the action with the rectangle boundary
				rectBoundary.action = action;
				createtext(text, x, y, z, color);
				// Add to intersected objects
				createHologramSprite(x, y + 1.3, z, holo);
			}
			// Create a green rectangle with download action
			createRectBoundary(
				0,
				0.1,
				-4,
				1,
				1,
				0x00ff00,
				downloadFile,
				"static/images/resumeim.png",
				"Download\nResume"
			);

			// Create a red rectangle with open link action
			createRectBoundary(
				8.009,
				0.1,
				-5.543,
				1,
				1,
				0x00ff00,
				openLink1,
				"static/images/social-media.png",
				"Social\nMedia"
			);

			createRectBoundary(
				8.237,
				0.1,
				-0.536,
				1,
				1,
				0x00ff00,
				openLink2,
				"static/images/project.png",
				"Projects"
			);

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
				loadedModelsCount++;
				checkLoadingComplete();
			});

			loader.load("models/gltf/sci-fi_lab.glb", (gltf) => {
				const lab = gltf.scene;
				lab.position.set(0, 0, 0);

				lab.traverse((object) => {
					if (object.isMesh) {
						object.castShadow = true;
						object.receiveShadow = true;

						if (object.material.map) {
							object.material.map.needsUpdate = false;
						}

						object.material.needsUpdate = false;

						intersectedObjects.current.push(object);
					}
				});

				labRef.current = lab;
				scene.add(lab);
				loadedModelsCount++;
				checkLoadingComplete();
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
			controls.enableRotate = false;
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
				targetRotationY += Math.PI / 2; // Set the target rotation
			} else if (event.code === "ArrowRight" || event.code === "KeyD") {
				targetRotationY -= Math.PI / 2; // Set the target rotation
			} else if (event.code === "Enter") {
				// Perform the action if an object is intersected
				if (
					currentIntersectedObject.current &&
					currentIntersectedObject.current.action
				) {
					currentIntersectedObject.current.action(); // Execute the associated function
				}
			}
		}

		function handleKeyUp(event) {
			if (event.code === "ArrowUp" || event.code === "KeyW") {
				switchAction(baseActions.idle.action);
				isWalking = false;
			}
		}

		function switchAction(toAction) {
			if (currentAction !== toAction) {
				currentAction.fadeOut(0.2);
				toAction.reset().fadeIn(0.2).play();
				currentAction = toAction;
			}
		}

		function moveForward(delta) {
			if (model) {
				const forwardDirection = new THREE.Vector3(0, 0, 1)
					.applyQuaternion(model.quaternion)
					.normalize();
				forwardDirection.y = 0;
				console.log(model.position.x, model.position.z);
				const newPosition = model.position
					.clone()
					.add(forwardDirection.multiplyScalar(moveSpeed * delta));

				raycaster.ray.origin.copy(model.position);
				raycaster.ray.direction.copy(forwardDirection);
				raycaster.far = moveSpeed * delta * (1 + safetyMargin);

				const intersects = raycaster.intersectObjects(
					intersectedObjects.current.filter(
						(object) => object.position.distanceTo(model.position) < 10
					), // Filter for nearby objects
					true
				);

				let isColliding = false;
				if (intersects.length > 0) {
					isColliding = intersects.some(
						(intersect) =>
							intersect.distance < moveSpeed * delta * (1 + safetyMargin)
					);
				}

				// Restrict movement to the defined boundaries
				if (!isColliding) {
					if (newPosition.x < -2.67) {
						newPosition.x = model.position.x; // Prevent movement further left
					}
					if (newPosition.z > 0.79) {
						newPosition.z = model.position.z; // Prevent movement further forward
					}
					model.position.copy(newPosition);

					camera.position.x = model.position.x;
					camera.position.z = model.position.z + 3;
					camera.position.y = 2;
				}
			}
		}

		function onWindowResize() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}

		const dict1 = {
			downloadFile: "Press enter to download my resume",
			openLink1: "Press enter to connect with me",
			openLink2: "Press enter to view my projects",
		};
		function checkIntersections() {
			if (!modelRef.current) return;

			const modelBoundingBox = new THREE.Box3().setFromObject(modelRef.current);
			currentIntersectedObject.current = null; // Reset the intersected object
			let actionMessage = "";

			objectRefs.current.forEach((rectBoundary) => {
				const boundingBox = new THREE.Box3().setFromObject(rectBoundary);
				const sprite =
					hologramSprites.current[objectRefs.current.indexOf(rectBoundary)];

				if (modelBoundingBox.intersectsBox(boundingBox)) {
					rectBoundary.material.color.set(0x00ff00);

					if (sprite) {
						sprite.visible = true;
						sprite.scale.x = Math.min(sprite.scale.x + 0.05, 1); // Smooth scaling
						sprite.scale.y = Math.min(sprite.scale.y + 0.05, 1);
						sprite.position.set(
							rectBoundary.position.x,
							rectBoundary.position.y + 1,
							rectBoundary.position.z
						);
					}

					currentIntersectedObject.current = rectBoundary; // Set the intersected object

					// Set action message based on the action

					if (rectBoundary.action.name in dict1) {
						actionMessage = dict1[rectBoundary.action.name];
					}
				} else {
					rectBoundary.material.color.set(0xffffff);

					if (sprite) {
						sprite.scale.x = Math.max(sprite.scale.x - 0.05, 0); // Smooth scaling
						sprite.scale.y = Math.max(sprite.scale.y - 0.05, 0);
						if (sprite.scale.x === 0) {
							sprite.visible = false;
						}
					}
				}
			});

			// Update HUD message
			hudMessage.textContent = actionMessage;
			hudMessage.style.display = actionMessage ? "block" : "none";
		}
		function checkLoadingComplete() {
			if (loadedModelsCount >= totalModelsToLoad) {
				loadingScreen.style.display = "none"; // Hide loading screen
				animate(); // Start animation loop
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
					model.rotation.y = targetRotationY;
				}
			}

			checkIntersections();
			renderer.render(scene, camera);
			requestAnimationFrame(animate);
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

	return (
		<>
			<div id="container"></div>
			<div
				id="loading-screen"
				style={{
					position: "fixed",
					top: 0,
					left: 0,
					width: "100vw",
					height: "100vh",
					background: "rgba(0, 0, 0, 0.8)",
					color: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					fontSize: "24px",
					fontFamily: "Arial, sans-serif",
					zIndex: 9999,
					overflow: "hidden", // Prevents any potential overflow issues
					alignContent: "center",
					textAlign: "center",
				}}>
				Loading...
				<br /> It can take some time for the models to load and please view this
				on a desktop only
				<br />
				controls:- <br /> W or Arrow Up to move <br /> A or Arrow Left to rotate
				left <br /> D or Arrow Right to rotate right <br />
				Enter to interact
			</div>
		</>
	);
};

export default Bot;
