"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PALETTE = {
  blue: 0x00b4ff,
  cyan: 0x008cff,
  orange: 0xff8c1a,
  gold: 0xffb84a,
};

type Quality = "low" | "medium" | "high";

function getQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  const w = window.innerWidth;
  if (w < 640) return "low";
  if (w < 1280) return "medium";
  return "high";
}

const PARTICLE_COUNTS: Record<Quality, number> = {
  low: 8000,
  medium: 20000,
  high: 38000,
};

interface NeuralFieldProps {
  intensity?: number;
}

export default function NeuralField({ intensity = 1 }: NeuralFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const quality = getQuality();
    const count = PARTICLE_COUNTS[quality];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorOrange = new THREE.Color(PALETTE.orange);
    const colorGold = new THREE.Color(PALETTE.gold);
    const colorBlue = new THREE.Color(PALETTE.blue);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.4 * Math.cbrt(Math.random());

      const x = r * Math.sin(phi) * Math.cos(theta) * 1.05;
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.85 + 0.2;
      const z = r * Math.cos(phi) * 0.9;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const t = Math.random();
      const mixed =
        t < 0.5
          ? colorOrange.clone().lerp(colorGold, t * 2)
          : colorGold.clone().lerp(colorBlue, (t - 0.5) * 2);

      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.028,
      vertexColors: true,
      transparent: true,
      opacity: 0.85 * intensity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const rings: THREE.Mesh[] = [];
    [3.4, 4.1, 4.8].forEach((radius, idx) => {
      const ringGeo = new THREE.TorusGeometry(radius, 0.005, 8, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? PALETTE.blue : PALETTE.cyan,
        transparent: true,
        opacity: 0.25 * intensity,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + idx * 0.4;
      ring.rotation.y = idx * 0.6;
      scene.add(ring);
      rings.push(ring);
    });

    let frameId = 0;
    let elapsed = 0;

    function animate() {
      frameId = requestAnimationFrame(animate);
      if (!prefersReducedMotion) {
        elapsed += 0.0025;
        points.rotation.y = elapsed * 0.6;
        rings.forEach((ring, idx) => {
          ring.rotation.z += 0.0007 * (idx + 1);
        });
        material.opacity = (0.75 + Math.sin(elapsed * 2) * 0.1) * intensity;
      }
      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(container.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
      rings.forEach((ring) => {
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [intensity]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
