import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 200;

function Particles() {
  const groupRef = useRef();
  const timeRef = useRef(0);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 8,
      z: Math.random() * -5,
      speed: 0.5 + Math.random() * 1.5,
      color: Math.random() > 0.5 ? '#7FCDFF' : '#DFF7FF',
    }));
  }, []);

  const meshRefs = useRef(particles.map(() => ({ current: null })));

  useFrame(() => {
    timeRef.current += 0.01;
    const t = timeRef.current;

    meshRefs.current.forEach((ref, i) => {
      const mesh = ref.current;
      if (!mesh) return;
      mesh.position.y += particles[i].speed * 0.005;
      mesh.position.x += Math.sin(t + i) * 0.003;
      if (mesh.position.y > 4) {
        mesh.position.y = -4;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = { current: el }; }}
          position={[p.x, p.y, p.z]}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function ParticleField() {
  return (
    <Canvas
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      camera={{ position: [0, 0, 8], fov: 70 }}
    >
      <ambientLight intensity={0.5} />
      <Particles />
    </Canvas>
  );
}
