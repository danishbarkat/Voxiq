import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function Cards() {
  const card1 = useRef();
  const card2 = useRef();
  const card3 = useRef();
  const timeRef = useRef(0);

  useFrame(() => {
    timeRef.current += 0.01;
    const t = timeRef.current;

    if (card1.current) {
      card1.current.position.y = 0.8 + Math.sin(t * 0.8) * 0.15;
      card1.current.rotation.y += 0.003;
    }
    if (card2.current) {
      card2.current.position.y = 0.0 + Math.sin(t * 0.6 + 1) * 0.2;
      card2.current.rotation.y += 0.003;
    }
    if (card3.current) {
      card3.current.position.y = -0.6 + Math.sin(t * 1.0 + 2) * 0.1;
      card3.current.rotation.y += 0.003;
    }
  });

  const cardMat = {
    color: '#0D3B6E',
    metalness: 0.3,
    roughness: 0.4,
    transparent: true,
    opacity: 0.85,
  };

  return (
    <>
      <mesh
        ref={card1}
        position={[-2.5, 0.8, -1]}
        rotation={[0.1, 0.3, 0.05]}
      >
        <boxGeometry args={[1.8, 1.1, 0.05]} />
        <meshStandardMaterial {...cardMat} />
      </mesh>
      <mesh
        ref={card2}
        position={[0, 0, -2]}
        rotation={[0.05, -0.2, 0.08]}
      >
        <boxGeometry args={[1.8, 1.1, 0.05]} />
        <meshStandardMaterial {...cardMat} />
      </mesh>
      <mesh
        ref={card3}
        position={[2.5, -0.6, -1.5]}
        rotation={[-0.1, 0.4, -0.05]}
      >
        <boxGeometry args={[1.8, 1.1, 0.05]} />
        <meshStandardMaterial {...cardMat} />
      </mesh>
    </>
  );
}

export default function FloatingCards() {
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
      camera={{ position: [0, 0, 6], fov: 60 }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} color="#7FCDFF" intensity={2} />
      <pointLight position={[-5, -5, -5]} color="#0A2540" intensity={1} />
      <Cards />
    </Canvas>
  );
}
