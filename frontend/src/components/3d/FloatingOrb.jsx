import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function OrbMesh() {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <mesh ref={meshRef} scale={[2.5, 2.5, 2.5]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        color="#0A2540"
        emissive="#7FCDFF"
        emissiveIntensity={0.15}
        shininess={80}
        specular="#7FCDFF"
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

export default function FloatingOrb() {
  return (
    <Canvas
      style={{ background: 'transparent', width: '100%', height: '450px' }}
      camera={{ position: [0, 0, 5], fov: 60 }}
    >
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} color="#7FCDFF" intensity={2} />
      <pointLight position={[-5, -3, -3]} color="#0A2540" intensity={1} />
      <OrbMesh />
    </Canvas>
  );
}
