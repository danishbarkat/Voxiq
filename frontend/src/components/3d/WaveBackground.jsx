import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function WavePlane() {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const posRef = useRef(null);

  useFrame(() => {
    if (!meshRef.current) return;
    timeRef.current += 0.015;
    const time = timeRef.current;

    const geo = meshRef.current.geometry;
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z =
        Math.sin(x * 0.8 + time) * 0.3 +
        Math.sin(y * 0.6 + time * 0.8) * 0.2;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2.5, 0, 0]}
      position={[0, -2, 0]}
    >
      <planeGeometry args={[20, 20, 64, 64]} />
      <meshStandardMaterial
        color="#7FCDFF"
        transparent
        opacity={0.08}
        wireframe={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function WaveBackground() {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'transparent',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      camera={{ position: [0, 4, 8], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 5, 5]} color="#7FCDFF" intensity={1} />
      <WavePlane />
    </Canvas>
  );
}
