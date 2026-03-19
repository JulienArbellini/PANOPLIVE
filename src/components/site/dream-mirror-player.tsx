"use client";

import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEventHandler, type RefObject } from "react";
import { useYouTubePlaylistPlayer } from "@/components/site/use-youtube-playlist-player";

type Props = {
  playlistId: string;
  artworkUrl?: string;
  title?: string;
  poeticLine?: string;
};

type GestureHint = "play" | "pause" | "next" | "previous" | null;
type WebcamState = "idle" | "requesting" | "granted" | "denied" | "unsupported";

type MirrorDiscProps = {
  artworkUrl?: string;
  isMobile: boolean;
  isPlaying: boolean;
  webcamEnabled: boolean;
  labelText: string;
  videoRef: RefObject<HTMLVideoElement | null>;
};

const MIRROR_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDirW;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDirW = normalize(-viewPosition.xyz);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const MIRROR_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uPlaying;
uniform float uEnergy;
uniform sampler2D uCoverTex;
uniform vec3 uGold;
uniform vec3 uCyan;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDirW;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

mat2 rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  float radius = length(centered);
  float angle = atan(centered.y, centered.x);
  float time = uTime * (0.32 + uPlaying * 0.86);

  vec2 wave = vec2(
    sin((uv.y * 26.0) + time * 2.8),
    cos((uv.x * 20.0) - time * 2.2)
  );
  float swirl = sin((uv.x + uv.y + time * 0.7) * 30.0) * 0.5 + 0.5;
  vec2 spinWarp = rot(time * (0.08 + uPlaying * 0.22)) * centered;
  uv += wave * (0.004 + 0.01 * uPlaying + 0.006 * uEnergy);
  uv += vec2(swirl - 0.5) * (0.002 + 0.004 * uPlaying);
  uv += spinWarp * (0.015 + uPlaying * 0.03) * smoothstep(0.62, 0.0, radius);
  uv = clamp(uv, 0.001, 0.999);

  vec2 chromaShift = normalize(centered + vec2(0.0001)) * (0.0015 + 0.0035 * uEnergy);
  vec4 coverBase = texture2D(uCoverTex, uv);
  vec4 coverShiftR = texture2D(uCoverTex, clamp(uv + chromaShift, 0.001, 0.999));
  vec4 coverShiftB = texture2D(uCoverTex, clamp(uv - chromaShift, 0.001, 0.999));
  vec3 coverColor = vec3(coverShiftR.r, coverBase.g, coverShiftB.b);

  float luma = dot(coverColor, vec3(0.299, 0.587, 0.114));
  vec3 monochrome = mix(vec3(luma), coverColor, 0.36 + 0.4 * uPlaying + 0.16 * uEnergy);

  float grooves = sin(radius * 520.0 - uTime * (2.0 + uPlaying * 8.0));
  float grooveMask = smoothstep(0.66, 0.08, radius);
  float grooveAmount = grooves * 0.03 * grooveMask;
  monochrome += vec3(grooveAmount);

  float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0), 2.4);
  float glint = pow(max(dot(normalize(vNormalW), normalize(vec3(0.26, 0.52, 1.0))), 0.0), 36.0);
  float anisotropic = pow(max(cos(angle * 7.0 + uTime * (0.8 + uPlaying * 2.6)), 0.0), 9.0) * (1.0 - smoothstep(0.08, 0.62, radius));

  float discMask = smoothstep(0.62, 0.58, radius);
  float ringMask = smoothstep(0.56, 0.44, radius);
  float innerRing = smoothstep(0.33, 0.31, abs(radius - 0.27));
  float edgeGlow = smoothstep(0.62, 0.5, radius) * (1.0 - smoothstep(0.8, 0.96, radius));

  vec3 prism = mix(uGold, uCyan, 0.28 + 0.26 * sin(uTime * 0.45 + radius * 8.0));
  vec3 highlights = prism * fresnel * (0.55 + 0.62 * uPlaying + 0.28 * uEnergy);
  highlights += vec3(0.9, 0.94, 1.0) * glint * (0.2 + 0.42 * uPlaying + 0.2 * uEnergy);
  highlights += mix(uCyan, uGold, 0.5 + 0.5 * sin(uTime * 0.8)) * anisotropic * (0.1 + 0.38 * uPlaying);
  highlights += vec3(1.0, 0.94, 0.82) * edgeGlow * (0.05 + 0.22 * uEnergy);

  float grain = (hash21(gl_FragCoord.xy + uTime * 31.7) - 0.5) * 0.035;

  vec3 color = monochrome * (0.62 + ringMask * 0.26 + discMask * 0.1);
  color += highlights;
  color += vec3(innerRing) * 0.06;
  color += vec3(grain);
  color = mix(color, color * (1.0 + vec3(0.06, 0.01, -0.04)), 0.16 * smoothstep(0.34, 0.62, radius));

  gl_FragColor = vec4(color, 1.0);
}
`;

const REFLECTION_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform float uEnergy;
uniform sampler2D uVideoTex;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDirW;

float hash21(vec2 p) {
  p = fract(p * vec2(231.34, 415.11));
  p += dot(p, p + 27.91);
  return fract(p.x * p.y);
}

void main() {
  vec2 centered = vUv - 0.5;
  float radius = length(centered);
  float discMask = smoothstep(0.505, 0.495, radius);

  vec2 uv = vec2(1.0 - vUv.x, vUv.y);
  uv += centered * 0.03;
  uv.y += sin((vUv.x * 9.0) + uTime * 0.4) * 0.008;
  uv = clamp(uv, 0.001, 0.999);

  vec3 videoColor = texture2D(uVideoTex, uv).rgb;
  float luma = dot(videoColor, vec3(0.299, 0.587, 0.114));
  vec3 reflection = mix(vec3(luma), videoColor, 0.16);

  float fresnel = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDirW)), 0.0), 3.6);
  float topLight = smoothstep(0.9, 0.15, vUv.y) * 0.22;
  float edgeFade = 1.0 - smoothstep(0.18, 0.48, radius);
  float grain = (hash21(gl_FragCoord.xy + uTime * 17.3) - 0.5) * 0.05;

  reflection = reflection * (0.62 + edgeFade * 0.18);
  reflection += vec3(topLight);
  reflection += vec3(fresnel * (0.08 + 0.12 * uEnergy));
  reflection += vec3(grain);

  float alpha = discMask * uOpacity * (0.24 + fresnel * 0.2 + topLight);
  gl_FragColor = vec4(reflection, alpha);
}
`;

function hintLabel(hint: GestureHint) {
  if (hint === "play") return "Lecture";
  if (hint === "pause") return "Pause";
  if (hint === "next") return "Vision suivante";
  if (hint === "previous") return "Vision precedente";
  return "";
}

function createFallbackCoverTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) {
    const data = new Uint8Array([20, 20, 24, 255]);
    const texture = new THREE.DataTexture(data, 1, 1);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const gradient = context.createRadialGradient(220, 200, 80, 384, 384, 520);
  gradient.addColorStop(0, "#f6f7fb");
  gradient.addColorStop(0.35, "#8f95a8");
  gradient.addColorStop(0.7, "#1f2635");
  gradient.addColorStop(1, "#06080f");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 34; i += 1) {
    const radius = 20 + i * 11;
    const alpha = 0.18 - i * 0.004;
    context.strokeStyle = `rgba(255,255,255,${Math.max(alpha, 0.015)})`;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(384, 384, radius, 0, Math.PI * 2);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function configureTexture(texture: THREE.Texture) {
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
}

function redrawDiscLabel(canvas: HTMLCanvasElement, title: string) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.285;
  const cleanTitle = title.trim().replace(/\s+/g, " ") || "PANOPLIE";
  const unit = ` ${cleanTitle.toUpperCase()} · `;
  let ringText = unit;
  while (ringText.length < 140) ringText += unit;

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(centerX, centerY);

  context.strokeStyle = "rgba(197, 160, 89, 0.14)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius - 28, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(0, 0, radius + 24, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "rgba(232, 216, 184, 0.9)";
  context.shadowColor = "rgba(197, 160, 89, 0.45)";
  context.shadowBlur = 16;
  context.font = '600 28px "Wornas personal use", serif';
  context.textAlign = "center";
  context.textBaseline = "middle";

  const chars = Array.from(ringText);
  const startAngle = -Math.PI / 2;
  const step = (Math.PI * 2) / chars.length;

  chars.forEach((char, index) => {
    const angle = startAngle + index * step;
    context.save();
    context.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    context.rotate(angle + Math.PI / 2);
    context.fillText(char, 0, 0);
    context.restore();
  });

  context.restore();
}

function ThreeMirrorDisc({ artworkUrl, isMobile, isPlaying, webcamEnabled, labelText, videoRef }: MirrorDiscProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  const playingRef = useRef(isPlaying);
  const webcamRef = useRef(webcamEnabled);
  const labelTextRef = useRef(labelText);
  const tiltTargetRef = useRef({ x: 0, y: 0 });
  const tiltRef = useRef({ x: 0, y: 0 });
  const labelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelTextureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    webcamRef.current = webcamEnabled;
  }, [webcamEnabled]);

  useEffect(() => {
    labelTextRef.current = labelText;
    const canvas = labelCanvasRef.current;
    const texture = labelTextureRef.current;
    if (!canvas || !texture) return;
    redrawDiscLabel(canvas, labelText);
    texture.needsUpdate = true;
  }, [labelText]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = "";

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      const fallback = document.createElement("div");
      fallback.className = "dream-liquid-canvas-fallback";
      if (artworkUrl) fallback.style.backgroundImage = `url(${artworkUrl})`;
      host.appendChild(fallback);
      return () => {
        host.innerHTML = "";
      };
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.35 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.className = "dream-liquid-canvas";

    host.appendChild(renderer.domElement);

    const handlePointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      tiltTargetRef.current.x = THREE.MathUtils.clamp(x, -1, 1);
      tiltTargetRef.current.y = THREE.MathUtils.clamp(y, -1, 1);
    };

    const handlePointerLeave = () => {
      tiltTargetRef.current.x = 0;
      tiltTargetRef.current.y = 0;
    };

    host.addEventListener("pointermove", handlePointerMove);
    host.addEventListener("pointerleave", handlePointerLeave);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 20);
    camera.position.set(0, 0, 4.35);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
    const keyLight = new THREE.PointLight(0xb8dfff, 2.45, 16, 2);
    keyLight.position.set(2.3, 2.2, 3.8);
    const warmLight = new THREE.PointLight(0xd8b278, 1.65, 12, 2);
    warmLight.position.set(-2.6, -1.6, 2.6);

    scene.add(ambientLight, keyLight, warmLight);

    const discGroup = new THREE.Group();
    scene.add(discGroup);

    const radialContainer = new THREE.Group();
    discGroup.add(radialContainer);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const coverTexture = artworkUrl
      ? loader.load(
          artworkUrl,
          (texture) => {
            configureTexture(texture);
          },
          undefined,
          () => {
            // Keep initial fallback if remote load fails.
          },
        )
      : createFallbackCoverTexture();

    if (artworkUrl) configureTexture(coverTexture);

    const webcamSource = videoRef.current;
    const webcamTexture = webcamSource
      ? new THREE.VideoTexture(webcamSource)
      : new THREE.DataTexture(new Uint8Array([12, 12, 12, 255]), 1, 1);

    configureTexture(webcamTexture);
    if (webcamTexture instanceof THREE.VideoTexture) {
      webcamTexture.generateMipmaps = false;
    }

    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uPlaying: { value: playingRef.current ? 1 : 0 },
      uEnergy: { value: 0.08 },
      uCoverTex: { value: coverTexture },
      uGold: { value: new THREE.Color("#c5a059") },
      uCyan: { value: new THREE.Color("#71d7ff") },
    };

    const mirrorMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: MIRROR_VERTEX_SHADER,
      fragmentShader: MIRROR_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
    });

    const discFace = new THREE.Mesh(new THREE.CircleGeometry(1.18, isMobile ? 128 : 192), mirrorMaterial);
    discFace.position.z = 0.065;

    const reflectionUniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uOpacity: { value: webcamRef.current ? 0.42 : 0 },
      uEnergy: { value: 0.08 },
      uVideoTex: { value: webcamTexture },
    };
    const reflectionMaterial = new THREE.ShaderMaterial({
      uniforms: reflectionUniforms,
      vertexShader: MIRROR_VERTEX_SHADER,
      fragmentShader: REFLECTION_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const reflectionMesh = new THREE.Mesh(new THREE.CircleGeometry(1.175, isMobile ? 128 : 192), reflectionMaterial);
    reflectionMesh.position.z = 0.09;

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 1024;
    labelCanvas.height = 1024;
    redrawDiscLabel(labelCanvas, labelTextRef.current);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    configureTexture(labelTexture);
    labelCanvasRef.current = labelCanvas;
    labelTextureRef.current = labelTexture;
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const labelMesh = new THREE.Mesh(new THREE.CircleGeometry(1.16, isMobile ? 96 : 160), labelMaterial);
    labelMesh.position.z = 0.082;

    const discBodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0d1018,
      metalness: 0.94,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      reflectivity: 0.9,
      sheen: 0.8,
      sheenColor: new THREE.Color("#77b9d8"),
      sheenRoughness: 0.35,
    });

    const discBody = new THREE.Mesh(
      new THREE.CylinderGeometry(1.19, 1.19, 0.11, isMobile ? 88 : 128, 1, true),
      discBodyMaterial,
    );
    discBody.rotation.x = Math.PI / 2;

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xc5a059,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.008, 8, isMobile ? 100 : 180), haloMaterial);
    halo.position.z = -0.01;

    radialContainer.add(discBody, discFace, labelMesh, halo);
    discGroup.add(reflectionMesh);

    const ringTickCount = isMobile ? 72 : 104;
    const ringTicks = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.011, 0.08, 0.01),
      new THREE.MeshBasicMaterial({
        color: 0x4c3d26,
        transparent: true,
        opacity: 0.62,
      }),
      ringTickCount,
    );

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const zAxis = new THREE.Vector3(0, 0, 1);

    for (let index = 0; index < ringTickCount; index += 1) {
      const angle = (index / ringTickCount) * Math.PI * 2;
      position.set(Math.cos(angle) * 1.43, Math.sin(angle) * 1.43, -0.05);
      quaternion.setFromAxisAngle(zAxis, angle);
      matrix.compose(position, quaternion, scale);
      ringTicks.setMatrixAt(index, matrix);
    }

    ringTicks.instanceMatrix.needsUpdate = true;
    discGroup.add(ringTicks);

    const reactiveBarCount = isMobile ? 48 : 84;
    const reactiveBars = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.012, 0.12, 0.012),
      new THREE.MeshBasicMaterial({
        color: 0xa6864f,
        transparent: true,
        opacity: isMobile ? 0.42 : 0.52,
      }),
      reactiveBarCount,
    );
    reactiveBars.position.z = -0.03;
    discGroup.add(reactiveBars);

    const particleCount = isMobile ? 120 : 220;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 2.1;
      const h = (Math.random() - 0.5) * 1.6;
      particlePositions[i * 3 + 0] = Math.cos(a) * r;
      particlePositions[i * 3 + 1] = Math.sin(a) * r;
      particlePositions[i * 3 + 2] = h;
      particleSeeds[i] = Math.random() * Math.PI * 2;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xbac6ff,
      size: isMobile ? 0.015 : 0.02,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    particles.position.z = -0.18;
    scene.add(particles);

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    let disposed = false;
    let angularVelocity = 0.012;
    let energy = 0.08;
    const clock = new THREE.Clock();
    const reactiveRadius = 1.56;
    const positionAttr = particlesGeometry.getAttribute("position") as THREE.BufferAttribute;

    const animate = () => {
      if (disposed) return;

      const time = clock.getElapsedTime();
      const playingTarget = playingRef.current ? 1 : 0;
      const webcamTarget = webcamRef.current ? 1 : 0;
      const beat = 0.5 + 0.5 * Math.sin(time * (0.8 + playingTarget * 2.6));
      const flutter = 0.5 + 0.5 * Math.cos(time * (1.8 + playingTarget * 5.2));
      const targetEnergy = playingTarget > 0.5 ? 0.35 + beat * 0.48 + flutter * 0.17 : 0.08;
      energy += (targetEnergy - energy) * (0.02 + 0.06 * playingTarget);

      uniforms.uTime.value = time;
      uniforms.uPlaying.value += (playingTarget - (uniforms.uPlaying.value as number)) * 0.062;
      uniforms.uEnergy.value += (energy - (uniforms.uEnergy.value as number)) * 0.08;
      reflectionUniforms.uTime.value = time;
      reflectionUniforms.uEnergy.value += (energy - (reflectionUniforms.uEnergy.value as number)) * 0.08;
      reflectionUniforms.uOpacity.value += ((webcamTarget ? 0.42 : 0) - (reflectionUniforms.uOpacity.value as number)) * 0.08;

      angularVelocity += ((0.015 + playingTarget * 0.22) - angularVelocity) * 0.03;
      radialContainer.rotation.z += angularVelocity * 0.03;

      tiltRef.current.x += (tiltTargetRef.current.x - tiltRef.current.x) * 0.06;
      tiltRef.current.y += (tiltTargetRef.current.y - tiltRef.current.y) * 0.06;

      const wobble = (0.011 + uniforms.uPlaying.value * 0.028) * Math.sin(time * 0.62);
      const wobbleY = (0.008 + uniforms.uPlaying.value * 0.024) * Math.cos(time * 0.54 + 0.8);
      radialContainer.rotation.x = wobble;
      radialContainer.rotation.y = wobbleY;
      discGroup.rotation.x = -tiltRef.current.y * 0.17;
      discGroup.rotation.y = tiltRef.current.x * 0.17;

      for (let i = 0; i < reactiveBarCount; i += 1) {
        const a = (i / reactiveBarCount) * Math.PI * 2;
        const phase = time * (1.1 + uniforms.uPlaying.value * 3.5) + i * 0.33;
        const signal = Math.abs(Math.sin(phase) * Math.cos(phase * 0.73 + i * 0.19));
        const barHeight = 0.08 + signal * (0.24 + energy * 0.65);
        const radius = reactiveRadius + signal * 0.08;
        position.set(Math.cos(a) * radius, Math.sin(a) * radius, -0.04);
        quaternion.setFromAxisAngle(zAxis, a);
        scale.set(1, barHeight, 1);
        matrix.compose(position, quaternion, scale);
        reactiveBars.setMatrixAt(i, matrix);
      }
      reactiveBars.instanceMatrix.needsUpdate = true;

      const pulse = 0.5 + Math.sin(time * (1 + uniforms.uPlaying.value * 2.2)) * 0.5;
      if (halo.material instanceof THREE.MeshBasicMaterial) {
        halo.material.opacity = 0.1 + uniforms.uPlaying.value * 0.25 + pulse * uniforms.uPlaying.value * 0.18;
      }

      keyLight.intensity = 2.2 + uniforms.uPlaying.value * 2.7 + energy * 0.4;
      warmLight.intensity = 1.4 + uniforms.uPlaying.value * 1.65;
      keyLight.position.x = Math.cos(time * 0.75) * 2.4;
      keyLight.position.y = 1.9 + Math.sin(time * 0.62) * 0.9;
      warmLight.position.x = Math.sin(time * 0.52 + 1.8) * -2.5;
      warmLight.position.y = -1.7 + Math.cos(time * 0.57) * 0.8;

      for (let i = 0; i < particleCount; i += 1) {
        const idx = i * 3;
        const seed = particleSeeds[i];
        const baseX = particlePositions[idx];
        const baseY = particlePositions[idx + 1];
        const baseZ = particlePositions[idx + 2];
        const drift = 0.04 + uniforms.uEnergy.value * 0.12;
        positionAttr.array[idx] = baseX + Math.cos(time * 0.4 + seed) * drift;
        positionAttr.array[idx + 1] = baseY + Math.sin(time * 0.35 + seed * 1.3) * drift;
        positionAttr.array[idx + 2] = baseZ + Math.sin(time * 0.7 + seed) * (0.03 + uniforms.uEnergy.value * 0.08);
      }
      positionAttr.needsUpdate = true;
      particles.rotation.z += 0.0007 + uniforms.uEnergy.value * 0.003;
      particlesMaterial.opacity = 0.28 + uniforms.uEnergy.value * (isMobile ? 0.18 : 0.28);
      particlesMaterial.size = (isMobile ? 0.015 : 0.02) + uniforms.uEnergy.value * (isMobile ? 0.012 : 0.018);

      if (webcamTexture instanceof THREE.VideoTexture) webcamTexture.needsUpdate = true;

      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerleave", handlePointerLeave);

      ringTicks.geometry.dispose();
      if (Array.isArray(ringTicks.material)) {
        ringTicks.material.forEach((material) => material.dispose());
      } else {
        ringTicks.material.dispose();
      }

      reactiveBars.geometry.dispose();
      if (Array.isArray(reactiveBars.material)) {
        reactiveBars.material.forEach((material) => material.dispose());
      } else {
        reactiveBars.material.dispose();
      }

      discFace.geometry.dispose();
      reflectionMesh.geometry.dispose();
      labelMesh.geometry.dispose();
      discBody.geometry.dispose();
      halo.geometry.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();

      mirrorMaterial.dispose();
      reflectionMaterial.dispose();
      labelMaterial.dispose();
      discBodyMaterial.dispose();
      haloMaterial.dispose();

      coverTexture.dispose();
      labelTexture.dispose();
      webcamTexture.dispose();
      labelCanvasRef.current = null;
      labelTextureRef.current = null;

      renderer.dispose();
      host.innerHTML = "";
    };
  }, [artworkUrl, isMobile, videoRef]);

  return <div ref={hostRef} className="dream-liquid-canvas-wrap" aria-hidden />;
}

export function DreamMirrorPlayer({
  playlistId,
  artworkUrl,
  title = "",
  poeticLine = "L'Autre Cote du Miroir",
}: Props) {
  const { containerId, state, trackTitle, isPlaying, playPause, next, previous, retry } = useYouTubePlaylistPlayer(playlistId);

  const [isMobile, setIsMobile] = useState(false);
  const [gestureHint, setGestureHint] = useState<GestureHint>(null);
  const [ripples, setRipples] = useState<number[]>([]);
  const [webcamState, setWebcamState] = useState<WebcamState>("idle");
  const hintTimeoutRef = useRef<number | null>(null);
  const pointerRef = useRef<{ id: number; startX: number; startY: number } | null>(null);
  const rippleIdRef = useRef(0);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const enter = () => document.body.classList.add("liquid-cursor-active");
    const leave = () => document.body.classList.remove("liquid-cursor-active");

    node.addEventListener("mouseenter", enter);
    node.addEventListener("mouseleave", leave);

    return () => {
      node.removeEventListener("mouseenter", enter);
      node.removeEventListener("mouseleave", leave);
      document.body.classList.remove("liquid-cursor-active");
    };
  }, []);

  const showHint = (hint: GestureHint) => {
    setGestureHint(hint);
    if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = window.setTimeout(() => setGestureHint(null), 900);
  };

  const triggerRipple = () => {
    rippleIdRef.current += 1;
    const id = rippleIdRef.current;
    setRipples((previousList) => [...previousList, id]);
  };

  const ensureWebcam = useCallback(async () => {
    if (webcamState === "granted" || webcamState === "requesting") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setWebcamState("unsupported");
      return;
    }

    setWebcamState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: isMobile ? 640 : 1280 },
          height: { ideal: isMobile ? 640 : 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setWebcamState("granted");
    } catch {
      setWebcamState("denied");
    }
  }, [isMobile, webcamState]);

  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return;
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
    void videoRef.current.play().catch(() => undefined);
  }, [webcamState]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = isPlaying;
    });
  }, [isPlaying]);

  const swipeThreshold = isMobile ? 44 : 56;

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    const gesture = pointerRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > swipeThreshold && absX > absY) {
      if (dx < 0) {
        next();
        showHint("next");
      } else {
        previous();
        showHint("previous");
      }
    } else if (absX < 12 && absY < 12) {
      if (!isPlaying) void ensureWebcam();
      if (!isPlaying) triggerRipple();
      playPause();
      showHint(isPlaying ? "pause" : "play");
    }

    pointerRef.current = null;
  };

  const onPointerCancel: PointerEventHandler<HTMLDivElement> = () => {
    pointerRef.current = null;
  };

  const handlePrevious = () => {
    previous();
    showHint("previous");
  };

  const handlePlayToggle = async () => {
    if (!isPlaying) await ensureWebcam();
    if (!isPlaying) triggerRipple();
    playPause();
    showHint(isPlaying ? "pause" : "play");
  };

  const handleNext = () => {
    next();
    showHint("next");
  };

  const stopShellPointer: PointerEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
  };

  const shellClass = useMemo(
    () =>
      `dream-liquid-shell ${isMobile ? "is-mobile" : ""} ${isPlaying ? "is-playing" : ""} ${state === "error" ? "is-error" : ""} ${webcamState === "granted" ? "has-webcam" : ""}`,
    [isMobile, isPlaying, state, webcamState],
  );

  const hintText = "Appuyer pour liberer l'onde";
  const currentTrackLabel = trackTitle || "L'espace entre les secondes";
  const bottomTitle = trackTitle || poeticLine;

  return (
    <div className="dream-liquid-player w-full max-w-xl">
      <div id={containerId} className="h-0 w-0 overflow-hidden" />

      <video ref={videoRef} className="hidden" muted playsInline autoPlay />

      <div
        ref={shellRef}
        className={shellClass}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: "pan-y" }}
      >
        <div className="dream-liquid-copy dream-liquid-copy-top">
          <p className="dream-liquid-kicker">Panoplie presente</p>
          <h4 className="dream-liquid-title">{title}</h4>
        </div>

        <div className="dream-liquid-disc-wrap" onClick={(event) => event.stopPropagation()}>
          <ThreeMirrorDisc
            artworkUrl={artworkUrl}
            isMobile={isMobile}
            isPlaying={isPlaying}
            webcamEnabled={webcamState === "granted" && isPlaying}
            labelText={currentTrackLabel}
            videoRef={videoRef}
          />
          <div className="dream-liquid-disc-sheen" aria-hidden />
          <div className="dream-liquid-center-ring">
            <div className="dream-liquid-center-dot" />
          </div>
          <div className="dream-liquid-ripple-layer">
            {ripples.map((id) => (
              <span
                key={id}
                className="dream-liquid-ripple"
                onAnimationEnd={() => setRipples((list) => list.filter((item) => item !== id))}
              />
            ))}
          </div>
          <div className="dream-liquid-controls" aria-label="Controles du lecteur">
            <button
              type="button"
              className="dream-liquid-control dream-liquid-control-side dream-liquid-control-prev"
              aria-label="Piste precedente"
              onPointerDown={stopShellPointer}
              onPointerUp={stopShellPointer}
              onClick={handlePrevious}
            >
              <span className="dream-liquid-control-icon" aria-hidden>
                ←
              </span>
              <span className="dream-liquid-control-label">Prev</span>
            </button>
            <button
              type="button"
              className="dream-liquid-control dream-liquid-control-main"
              aria-label={isPlaying ? "Mettre en pause" : "Lancer la lecture"}
              onPointerDown={stopShellPointer}
              onPointerUp={stopShellPointer}
              onClick={() => {
                void handlePlayToggle();
              }}
            >
              <span className="dream-liquid-control-main-core" aria-hidden>
                {isPlaying ? "II" : "▶"}
              </span>
              <span className="dream-liquid-control-main-label">{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              className="dream-liquid-control dream-liquid-control-side dream-liquid-control-next"
              aria-label="Piste suivante"
              onPointerDown={stopShellPointer}
              onPointerUp={stopShellPointer}
              onClick={handleNext}
            >
              <span className="dream-liquid-control-icon" aria-hidden>
                →
              </span>
              <span className="dream-liquid-control-label">Next</span>
            </button>
          </div>
        </div>

        <div className="dream-liquid-copy dream-liquid-copy-bottom">
          <p className="dream-liquid-hint">{hintText}</p>
          <p className="dream-liquid-poetic">{bottomTitle}</p>
        </div>

        <div className="dream-liquid-gesture dream-liquid-gesture-left">←</div>
        <div className="dream-liquid-gesture dream-liquid-gesture-right">→</div>
        {gestureHint ? <div className="dream-liquid-gesture-hint">{hintLabel(gestureHint)}</div> : null}
      </div>

      {state === "error" ? (
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-[11px] tracking-[0.2em] text-amber-100 uppercase hover:bg-amber-500/25"
        >
          Reessayer
        </button>
      ) : null}
    </div>
  );
}
