import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import '../../shaders/RevealMaterial';
import { isTouchDevice } from '../../../../utils/deviceDetect';

// Reusable Vector3 to avoid allocations in useFrame
const _tempScale = new THREE.Vector3();

const SocialBarrel = ({
    position,
    rotation = [0, 0, 0],
    texturePath,
    paintedTexturePath,
    label,
    onClick,
    isSelected = false,
    scale = [2.12, 2.3],
    paintOnBeforeCompile,
    paintUniforms
}) => {
    const meshRef = useRef();
    const materialRef = useRef();
    const paintedRef = useRef();
    const hideDelayRef = useRef();

    // Load sketch texture
    const texture = useTexture(texturePath);

    // ============================================
    // PAINTED TEXTURE
    // ============================================
    // If a paintedTexturePath is supplied, use that exact file.
    // Otherwise preserve the old automatic filename behavior.
    const isTouch = isTouchDevice();

    const fallbackPaintedTexturePath =
        texturePath
            .replace('.png', '_painted.png')
            .replace('.webp', '_painted.webp');

    const finalPaintedTexturePath =
        paintedTexturePath || fallbackPaintedTexturePath;

    // The selected state must show the painted artwork on touch devices too.
    // Hover remains disabled on touch, but selection is still a persistent action.
    const texturePainted = useTexture(finalPaintedTexturePath);

    const textRef = useRef();

    const [hovered, setHovered] = useState(false);

    // A clicked option remains painted after the pointer leaves it.
    useEffect(() => {
        if (hideDelayRef.current) {
            hideDelayRef.current.kill();
            hideDelayRef.current = null;
        }

        if (isSelected) {
            if (paintedRef.current) paintedRef.current.visible = true;

            if (materialRef.current) {
                gsap.to(materialRef.current, {
                    uProgress: 1.0,
                    duration: 0.25,
                    ease: 'power2.out',
                    overwrite: true
                });
            }
        }
    }, [isSelected]);

    // ============================================
    // ANIMATION
    // ============================================

    useFrame((state) => {
        if (meshRef.current) {
            const time = state.clock.getElapsedTime();

            // Synced with sea waves (speed ~0.8, amp ~0.15)
            // Added random phase offset based on x position to prevent them continuously bobbing in perfect unison
            const phaseOffset = position[0] * 0.5;

            meshRef.current.position.y =
                position[1] +
                Math.sin(time * 0.8 + phaseOffset) * 0.15;

            // Horizontal drift (gentle left/right)
            meshRef.current.position.x =
                position[0] +
                Math.sin(time * 0.4 + phaseOffset) * 0.2;

            // Gentle rotation drift
            meshRef.current.rotation.z =
                rotation[2] +
                Math.sin(time * 0.6 + phaseOffset) * 0.05;

            // Hover scale
            const targetScale = hovered ? 1.1 : 1;

            // Apply hover factor
            meshRef.current.scale.lerp(
                _tempScale.set(
                    targetScale,
                    targetScale,
                    1
                ),
                0.1
            );

            // ============================================
            // PAINT TRANSITION FOR TEXT
            // ============================================

            if (paintUniforms && textRef.current) {
                const localPos = meshRef.current.position;

                const revealDir = new THREE.Vector3(
                    1.0,
                    0.0,
                    -0.1
                ).normalize();

                const pStartDist = -5.0;
                const pEndDist = 55.0;

                const pTargetDist = THREE.MathUtils.lerp(
                    pStartDist,
                    pEndDist,
                    paintUniforms.uPaintProgress.value
                );

                const pDistFromPlane =
                    pTargetDist -
                    localPos.dot(revealDir);

                textRef.current.fillOpacity =
                    THREE.MathUtils.clamp(
                        pDistFromPlane,
                        0,
                        1
                    );
            }
        }
    });

    // ============================================
    // HOVER ON
    // ============================================

    const handlePointerOver = () => {
        if (isTouch) return;

        document.body.style.cursor = 'pointer';
        setHovered(true);

        if (isSelected) {
            if (paintedRef.current) paintedRef.current.visible = true;
        }

        if (materialRef.current) {
            gsap.to(materialRef.current, {
                uProgress: 1.0,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: true
            });
        }

        if (hideDelayRef.current) {
            hideDelayRef.current.kill();
        }

        if (paintedRef.current) {
            paintedRef.current.visible = true;
        }
    };

    // ============================================
    // HOVER OFF
    // ============================================

    const handlePointerOut = () => {
        if (isTouch) return;

        document.body.style.cursor = 'auto';
        setHovered(false);

        if (isSelected) {
            if (paintedRef.current) paintedRef.current.visible = true;
            if (materialRef.current) {
                gsap.to(materialRef.current, {
                    uProgress: 1.0,
                    duration: 0.2,
                    ease: 'power2.out',
                    overwrite: true
                });
            }
            return;
        }

        if (materialRef.current) {
            gsap.to(materialRef.current, {
                uProgress: 0.0,
                duration: 0.5,
                ease: 'power2.out',
                overwrite: true
            });
        }

        hideDelayRef.current = gsap.delayedCall(
            0.55,
            () => {
                if (paintedRef.current) {
                    paintedRef.current.visible = false;
                }
            }
        );
    };

    // ============================================
    // CLEANUP
    // ============================================

    useEffect(() => {
        return () => {
            document.body.style.cursor = 'auto';

            if (hideDelayRef.current) {
                hideDelayRef.current.kill();
            }
        };
    }, []);

    // ============================================
    // RENDER
    // ============================================

    return (
        <group
            ref={meshRef}
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();

                if (onClick) {
                    onClick();
                }
            }}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >

            {/* ============================================ */}
            {/* PAINTED LAYER - BEHIND */}
            {/* ============================================ */}

            <mesh
                ref={paintedRef}
                position={[0, 0, -0.001]}
                visible={false}
            >
                <planeGeometry args={scale} />

                <meshBasicMaterial
                    color="#e0e0e0"
                    map={texturePainted}
                    transparent={true}
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={paintOnBeforeCompile}
                    needsUpdate={!!paintOnBeforeCompile}
                />
            </mesh>

            {/* ============================================ */}
            {/* SKETCH OVERLAY - FRONT */}
            {/* ============================================ */}
            {/* Brush-stroke discard reveals the unique
                painted artwork underneath. */}

            <mesh position={[0, 0, 0]}>
                <planeGeometry args={scale} />

                <revealMaterial
                    color="#e0e0e0"
                    ref={materialRef}
                    map={texture}
                    transparent={true}
                    alphaTest={0.1}
                    uProgress={0.0}
                    paintUniforms={paintUniforms}
                    paintConfig={{
                        dirX: 1.0,
                        dirY: 0.0,
                        dirZ: -0.1,
                        startDist: -5.0,
                        endDist: 55.0,
                        noiseAxes: 'yz'
                    }}
                />
            </mesh>

            {/* ============================================ */}
            {/* BUDGET LABEL */}
            {/* ============================================ */}

            {label && (
                <Text
                    ref={textRef}
                    position={[
                        0,
                        scale[1] * 0.26,
                        0.05
                    ]}
                    rotation={[0, 0, 0.03]}
                    fontSize={scale[0] * 0.14}
                    font="/fonts/CabinSketch-Bold.ttf"
                    color="#111111"
                    fillOpacity={paintUniforms ? 0 : 1}
                    anchorX="center"
                    anchorY="middle"
                >
                    {label}
                </Text>
            )}

        </group>
    );
};

export default SocialBarrel;