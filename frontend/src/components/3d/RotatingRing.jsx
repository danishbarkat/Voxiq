import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Rings() {
  const ring1 = useRef();
  const ring2 = useRef();

  useFrame(() => {
    if (ring1.current) {
      ring1.current.rotation.x += 0.005;
      ring1.current.rotation.y += 0.003;
    }
    if (ring2.current) {
      ring2.current.rotation.x -= 0.003;
      ring2.current.rotation.z += 0.004;
    }
  });

  return (
    <>
      <mesh ref={ring1}>
        <torusGeometry args={[1.5, 0.03, 16, 100]} />
        <meshStandardMaterial
          color="#7FCDFF"
          emissive="#7FCDFF"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[2.2, 0.02, 16, 100]} />
        <meshStandardMaterial
          color="#DFF7FF"
          emissive="#DFF7FF"
          emissiveIntensity={0.3}
        />
      </mesh>
    </>
  );
}

export default function RotatingRing({ size = 300 }) {
  return (
    <Canvas
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: 'transparent',
        pointerEvents: 'none',
      }}
      camera={{ position: [0, 0, 5], fov: 60 }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} color="#7FCDFF" intensity={2} />
      <Rings />
    </Canvas>
  );
}
