import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

const OPTIONS = [
  'HR & People Management',
  'Finance & Banking',
  'IT & Technology',
  'Marketing & Sales',
  'Operations & Supply Chain',
  'General Management',
];

const GalleryRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
  const roomRef = useRef();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((state) => {
    if (!roomRef.current) return;
    roomRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
  });

  return (
    <group ref={roomRef} position={[0, 0, -18]}>
      <mesh position={[0, -1.7, -5]}>
        <planeGeometry args={[24, 14]} />
        <meshStandardMaterial color="#f5f0eb" transparent opacity={0.8} />
      </mesh>

      {OPTIONS.map((option, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const x = (column - 1) * 5.1;
        const y = 2.4 - row * 2.8;
        const isActive = selected === option;

        return (
          <group
            key={option}
            position={[x, y, 0.2]}
            onClick={(event) => {
              event.stopPropagation();
              setSelected(option);
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = 'default')}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[3.9, 1.8, 0.35]} />
              <meshStandardMaterial
                color={isActive ? '#C32648' : '#ffffff'}
                emissive={isActive ? '#C32648' : '#dfe5ee'}
                emissiveIntensity={isActive ? 0.3 : 0.05}
              />
            </mesh>
            <Text
              position={[0, 0.1, 0.25]}
              fontSize={0.42}
              color={isActive ? '#ffffff' : '#1f2d3d'}
              anchorX="center"
              anchorY="middle"
              maxWidth={3.3}
              lineHeight={1.15}
            >
              {option}
            </Text>
          </group>
        );
      })}
    </group>
  );
};

export default GalleryRoom;
