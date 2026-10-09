import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, PositionalAudio } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import MessagePaper from './MessagePaper';
import SocialBarrel from './SocialBarrel';
import { useScene } from '../../../../context/SceneContext';
import GalleryClouds from '../Gallery/GalleryClouds';
import { useAchievements } from '../../../../context/AchievementsContext';
import { useAudio } from '../../../../context/AudioManager';

// ============================================
// ============================================
// 🌊 CONTACT ROOM v2 - NOW USED AS BUDGET ROOM
// Immersive budget selection inside the existing ocean room
// ============================================

import { useTexture } from '@react-three/drei';
import { usePaintMaterial } from '../Gallery/usePaintMaterial';

const WAVE_LAYERS = 4;

// ============================================
// 💰 BUDGET OPTIONS
// Each option has its own sketch + painted WEBP
// ============================================

const BUDGET_OPTIONS = [
    {
        id: 'under-1-lakh',
        value: 'Under ₹1 Lakh',
        label: 'UNDER ₹1 LAKH',
        texture: '/textures/contact/budget_under_1_lakh.png',
        paintedTexture: '/textures/contact/budget_under_1_lakh_painted.png'
    },
    {
        id: '1-2-lakhs',
        value: '₹1–2 Lakhs',
        label: '₹1–2 LAKHS',
        texture: '/textures/contact/budget_1_2_lakhs.png',
        paintedTexture: '/textures/contact/budget_1_2_lakhs_painted.png'
    },
    {
        id: '2-3-lakhs',
        value: '₹2–3 Lakhs',
        label: '₹2–3 LAKHS',
        texture: '/textures/contact/budget_2_3_lakhs.png',
        paintedTexture: '/textures/contact/budget_2_3_lakhs_painted.png'
    },
    {
        id: '3-5-lakhs',
        value: '₹3–5 Lakhs',
        label: '₹3–5 LAKHS',
        texture: '/textures/contact/budget_3_5_lakhs.png',
        paintedTexture: '/textures/contact/budget_3_5_lakhs_painted.png'
    },
    {
        id: '5-lakhs-plus',
        value: '₹5 Lakhs+',
        label: '₹5 LAKHS+',
        texture: '/textures/contact/budget_5_lakhs_plus.png',
        paintedTexture: '/textures/contact/budget_5_lakhs_plus_painted.png'
    }
];

// ============================================
// ⚙️ AUDIO SETTINGS - TWEAK HERE
// Edytuj te wartości, aby zmienić głośność i zasięg słyszalności szumu morza
// ============================================
export const AUDIO_SETTINGS = {
    volume: 2,
    distance: 2,           // Dystans, od którego dźwięk zaczyna cichnąć (refDistance)
    rolloff: 1.2           // Szybkość cichnięcia (rolloffFactor)
};

// ============================================
// ⚙️ LATARNIA SETTINGS - TWEAK HERE
// Edytuj te wartości, aby zmienić pozycję, obrót i wielkość latarni
// ============================================
export const LATARNIA_SETTINGS = {
    // Pozycja: [lewo/prawo (X), góra/dół (Y), tył/przód (Z)]
    position: [-10, 5, -20],

    // Rotacja: [przechył w przód/tył (X), obrót w lewo/prawo (Y), obrót na boki (Z)]
    rotation: [0, 0.1, 0],

    // Wielkość: [szerokość, wysokość]
    scale: [4.49, 5] // Legacy ratio 1102/1225
};

// ============================================
// ⚙️ STATEK SETTINGS - TWEAK HERE
// Edytuj te wartości, aby zmienić pozycję, obrót i wielkość statku
// ============================================
export const STATEK_SETTINGS = {
    // Pozycja: [lewo/prawo (X), góra/dół (Y), tył/przód (Z)]
    position: [0, 1.6, -15],

    // Rotacja: [przechył w przód/tył (X), obrót w lewo/prawo (Y), obrót na boki (Z)]
    rotation: [0, -0.2, 0],

    // Wielkość: [szerokość, wysokość]
    scale: [3.35, 1.3] // Legacy ratio 2525/978
};

// ============================================
// ⚙️ CAMERA SETTINGS - TWEAK HERE
// ============================================
const CAMERA_SETTINGS = {
    // Rotation X: How much to look down (radians)
    // -1.5 is straight down (-90 deg), -1.2 is ~70 deg
    lookDownAngle: -1.2,

    // Rotation Y: Left/Right turn
    // Set to 0 to force center, or null to keep current direction
    forceCenterY: -1.05, // FORCE CENTER to align paper straight

    // Rotation Z: Tilt/Roll
    // Set to 0 to straighten the camera
    forceStraightZ: 0,

    // Animation speed
    lerpSpeed: 2.5
};

// Experience phases
const PHASE = {
    ENTERING: 'entering',      // Camera entering room, looking at menu
    LOOKING_DOWN: 'looking_down', // Camera animating to look at dock
    WRITING: 'writing',        // User writing on paper
    ROLLING: 'rolling',        // Paper rolling into bottle
    HOLDING: 'holding',        // Camera holding bottle, looking at sea
    THROWING: 'throwing',      // Bottle being thrown
    DONE: 'done'               // Bottle floating away
};

const ContactRoom = ({ showRoom, onReady, isExiting, isWarmup }) => {
    const { camera } = useThree();

    // Existing journey context:
    // saveBudget() stores the selected budget.
    // requestExit() uses the existing room/corridor exit behavior.
    const {
        isTeleporting,
        saveRoomAnswer,
        requestExit
    } = useScene();

    const { showTutorial, unlockAchievement, hidePopup } = useAchievements();
    const { globalVolume, isMuted } = useAudio();
    const effectiveVolume = isMuted ? 0 : AUDIO_SETTINGS.volume * globalVolume;

    const audioRef = useRef();

    useEffect(() => {
        if (audioRef.current && audioRef.current.setVolume) {
            audioRef.current.setVolume(effectiveVolume);
        }
    }, [effectiveVolume]);

    useEffect(() => {
        if (isExiting || isTeleporting) {
            hidePopup();
        }
    }, [isExiting, isTeleporting, hidePopup]);

    // ============================================
    // LOAD ROOM TEXTURES
    // ============================================

    // Load Sea Texture
    const seaTexture = useTexture("/textures/contact/faletopdown.webp");

    // Load Molo Texture
    const moloTexture = useTexture("/textures/contact/molo.webp");

    // Load Latarnia Texture
    const latarniaTexture = useTexture("/textures/contact/latarnia.webp");

    // Load Statek Texture
    const statekTexture = useTexture("/textures/contact/statek.webp");

    // ============================================
    // CONFIGURE TEXTURE REPEATING
    // ============================================

    useEffect(() => {
        if (seaTexture) {
            seaTexture.wrapS = seaTexture.wrapT = THREE.MirroredRepeatWrapping;
            seaTexture.repeat.set(6, 4);
            seaTexture.needsUpdate = true;
        }

        if (moloTexture) {
            moloTexture.wrapS = moloTexture.wrapT = THREE.RepeatWrapping;
            moloTexture.center.set(0.5, 0.5);
            moloTexture.rotation = Math.PI / 2;
            moloTexture.repeat.set(1, 1);
            moloTexture.needsUpdate = true;
        }
    }, [seaTexture, moloTexture]);

    useEffect(() => {
        // Change to YXZ smoothly on mount for proper head nodding,
        // avoiding mathematical snapping of the Euler angles.
        camera.rotation.reorder('YXZ');

        return () => {
            // Restore default XYZ on unmount so other rooms/corridors don't break
            camera.rotation.reorder('XYZ');
        };
    }, [camera]);

    // ============================================
    // PAINT TRANSITION
    // ============================================

    // Contact is on the RIGHT side of the corridor, so reveal goes from right (+X) into the room
    const groupRef = useRef();

    const {
        onBeforeCompile,
        animatePaint,
        resetPaint,
        uniformsData,
        updateRoomOrigin
    } = usePaintMaterial({
        dirX: 1.0,    // Opposite to Gallery (right side door)
        dirY: 0.0,
        dirZ: -0.1,   // Slight angle matching mirrored direction
        startDist: -5.0,
        endDist: 55.0,
        noiseAxes: 'yz'
    });

    const [isTransitioning, setIsTransitioning] = useState(false);

    const wasTeleportedRef = useRef(false);

    useEffect(() => {
        if (isTeleporting) wasTeleportedRef.current = true;
    }, [isTeleporting]);

    useEffect(() => {
        if (showRoom && !isWarmup) {
            if (wasTeleportedRef.current || isTeleporting) {
                uniformsData.uPaintProgress.value = 1.0;
                setIsTransitioning(false);
            } else {
                setIsTransitioning(true);
                resetPaint();
                animatePaint(0.2, 2.5);

                setTimeout(() => {
                    setIsTransitioning(false);
                }, 2700);
            }
        } else {
            uniformsData.uPaintProgress.value = 1.0;
        }
    }, [showRoom, isWarmup, isTeleporting]);

    // ============================================
    // READY TRACKING
    // ============================================

    const hasSignaledReady = useRef(false);
    const frameCount = useRef(0);
    const FRAMES_TO_WAIT = 5;

    // ============================================
    // PHASE STATE
    // ============================================

    const [currentPhase, setCurrentPhase] = useState(PHASE.ENTERING);

    // Keep existing selection state.
    // The budget options are visible when the user enters the room.
    const [showSelection, setShowSelection] = useState(true);

    // Keep the chosen budget painted while the existing door-exit animation starts.
    const [selectedBudget, setSelectedBudget] = useState(null);
    const hasBudgetSelectionRef = useRef(false);

    const hasAnimatedDown = useRef(false);

    // Latch exit state to prevent glitch
    const hasExitTriggered = useRef(false);

    if (isExiting && !hasExitTriggered.current) {
        hasExitTriggered.current = true;

        // Do NOT reorder to XYZ here. Let DoorSection's GSAP animate camera back to the door
        // while remaining in YXZ order. This prevents "neck snapping" because interpolating
        // to X=0 in YXZ order naturally lifts the head up without twisting the neck.
    }

    // ============================================
    // REFS FOR ANIMATIONS
    // ============================================

    const waveRefs = useRef([]);
    const statekRef = useRef(); // Ref for ship animation

    // Target rotation values
    const targetRotX = useRef(0);
    const targetRotY = useRef(0);
    const targetRotZ = useRef(0);

    // ============================================
    // RESET WHEN TELEPORTING
    // ============================================

    useEffect(() => {
        if (isTeleporting) {
            hasAnimatedDown.current = false;
            hasExitTriggered.current = false;
            hasBudgetSelectionRef.current = false;
            setSelectedBudget(null);
            targetRotX.current = 0;
            targetRotY.current = 0;
            targetRotZ.current = 0;

            setCurrentPhase(PHASE.ENTERING);
            setShowSelection(true);
        }
    }, [isTeleporting]);

    // ============================================
    // ROOM INITIALIZATION / EXIT CLEANUP
    // ============================================

    useEffect(() => {
        if (hasSignaledReady.current && !hasAnimatedDown.current && showRoom) {
            // Just ensure we are in entering phase
            // We wait for user selection to trigger the rest
        }

        // EXIT ANIMATION CLEANUP
        if (!showRoom) {
            hasExitTriggered.current = false;

            if (hasAnimatedDown.current) {
                hasAnimatedDown.current = false;
                setCurrentPhase(PHASE.ENTERING);
                targetRotX.current = 0;
                targetRotZ.current = 0;
                setShowSelection(true);
            }
        }
    }, [hasSignaledReady.current, showRoom, camera]);

    // ============================================
    // OLD MAIL HANDLER
    // Kept intentionally because this was existing room behavior.
    // Budget selection does NOT use it anymore.
    // ============================================

    const handleMailSelect = () => {
        // Awaryjne przekierowanie mailto:
        window.location.href = 'mailto:tomszma12@gmail.com';

        /*
        setShowSelection(false);

        // Trigger the look down sequence
        hasAnimatedDown.current = true;
        hasExitTriggered.current = false;

        // Capture landing rotation (usually 0,0,0)
        targetRotX.current = camera.rotation.x;
        targetRotY.current = camera.rotation.y;
        targetRotZ.current = camera.rotation.z;

        // Start sequence directly
        setCurrentPhase(PHASE.LOOKING_DOWN);

        // 1. SET X (Looking down)
        targetRotX.current = CAMERA_SETTINGS.lookDownAngle;

        // 2. SET Y (Turning)
        if (CAMERA_SETTINGS.forceCenterY !== null) {
            targetRotY.current = CAMERA_SETTINGS.forceCenterY;
        }

        // 3. SET Z (Tilt)
        if (CAMERA_SETTINGS.forceStraightZ !== null) {
            targetRotZ.current = CAMERA_SETTINGS.forceStraightZ;
        }

        // Phase transition
        setTimeout(() => {
            setCurrentPhase(PHASE.WRITING);
        }, 1500);
        */
    };

    // ============================================
    // BUDGET SELECTION
    // ============================================

    const handleBudgetSelect = (budget) => {
        // Do not allow a second click once this selection has started the exit.
        if (
            hasBudgetSelectionRef.current ||
            isTransitioning ||
            isExiting ||
            isTeleporting
        ) {
            return;
        }

        // Paint and hold the chosen option visibly before leaving the room.
        hasBudgetSelectionRef.current = true;
        setSelectedBudget(budget);

        // Contact is the third journey room and stores the budget answer.
        // Do not request an exit unless the answer was accepted by SceneContext.
        const saved = saveRoomAnswer('contact', budget);
        if (!saved) {
            hasBudgetSelectionRef.current = false;
            setSelectedBudget(null);
            return;
        }

        // Use the existing Gallery-style room exit. DoorSection handles the
        // reverse walk through the corridor and closes this room's door.
        requestExit();
    };

    // ============================================
    // FRAME LOOP
    // ============================================

    useFrame((state, delta) => {
        // Update room origin for paint shader
        updateRoomOrigin(groupRef);

        if (!hasSignaledReady.current) {
            frameCount.current++;

            if (frameCount.current >= FRAMES_TO_WAIT) {
                hasSignaledReady.current = true;

                onReady?.();

                if (!isWarmup) {
                    setTimeout(() => showTutorial('contact_submit'), 2000);
                }
            }
        }

        // ============================================
        // CAMERA ANIMATION
        // ============================================

        if (hasAnimatedDown.current && !isExiting && !hasExitTriggered.current) {
            // Only animate if we started the 'look down' sequence AND we are NOT exiting.
            // When exiting, DoorSection.jsx takes full control of the camera with GSAP.

            // Clamp delta to prevent massive jumps when React re-renders lag the frame rate
            const safeDelta = Math.min(delta, 0.033);
            const lerpSpeed = safeDelta * CAMERA_SETTINGS.lerpSpeed;

            // NORMAL MODE (Look Down)
            camera.rotation.x = THREE.MathUtils.lerp(
                camera.rotation.x,
                targetRotX.current,
                lerpSpeed
            );

            camera.rotation.y = THREE.MathUtils.lerp(
                camera.rotation.y,
                targetRotY.current,
                lerpSpeed
            );

            camera.rotation.z = THREE.MathUtils.lerp(
                camera.rotation.z,
                targetRotZ.current,
                lerpSpeed
            );
        }

        // ============================================
        // WAVE ANIMATION
        // ============================================

        const time = state.clock.getElapsedTime();

        waveRefs.current.forEach((ref, i) => {
            if (ref) {
                const speed = 0.8 + i * 0.15;
                const amplitude = 0.15 - i * 0.02;
                const offset = i * 0.5;

                ref.position.y =
                    Math.sin(time * speed + offset) * amplitude;
            }
        });

        // ============================================
        // SHIP ANIMATION
        // ============================================

        if (statekRef.current) {
            // 🌊 Bobbing up and down (Y axis)
            const bobSpeed = 0.8;
            const bobAmplitude = 0.3;

            statekRef.current.position.y =
                STATEK_SETTINGS.position[1] +
                Math.sin(time * bobSpeed) * bobAmplitude;

            // ⛵ Sailing left and right (X axis)
            const sailSpeed = 0.04;
            const sailAmplitude = 12;

            statekRef.current.position.x =
                STATEK_SETTINGS.position[0] +
                Math.sin(time * sailSpeed) * sailAmplitude;

            // 🔄 Add a slight tilt on the Z axis (roll)
            const rollAmplitude = 0.05;

            statekRef.current.rotation.z =
                Math.sin(time * bobSpeed * 1.2) * rollAmplitude;
        }
    });

    // ============================================
    // MOBILE DETECTION
    // ============================================

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1000);
        };

        checkMobile();

        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ============================================
    // RENDER
    // ============================================

    return (
        <group ref={groupRef} position={[0, -0.7, -5]}>

            {!isWarmup && (
                <PositionalAudio
                    ref={audioRef}
                    url="/sounds/szummorza.mp3"
                    distanceModel="exponential"
                    refDistance={AUDIO_SETTINGS.distance}
                    rolloffFactor={AUDIO_SETTINGS.rolloff}
                    loop
                    autoplay
                    volume={effectiveVolume}
                />
            )}

            {/* ☁️ CLOUDS */}
            <GalleryClouds
                count={45}
                seed={88}
                rotationOffset={[0, 1, 0]}
            />

            {/* 🌊 OCEAN WAVE LAYERS */}
            <group position={[0, -1, -8]}>
                {Array.from({ length: WAVE_LAYERS }).map((_, i) => (
                    <mesh
                        key={i}
                        ref={el => waveRefs.current[i] = el}
                        position={[0, -i * 0.1, -i * 8]}
                        rotation={[-Math.PI / 2.5, 0, 0]}
                    >
                        <planeGeometry args={[80, 30]} />

                        <meshBasicMaterial
                            map={seaTexture}
                            color="#ffffff"
                            transparent={true}
                            opacity={1 - i * 0.1}
                            side={THREE.DoubleSide}
                            toneMapped={false}
                            onBeforeCompile={onBeforeCompile}
                        />
                    </mesh>
                ))}
            </group>

            {/* ============================================ */}
            {/* 💰 BUDGET OPTIONS */}
            {/* ============================================ */}

            {/* UNDER ₹1 LAKH */}
            <SocialBarrel
                position={isMobile ? [-1.15, 0.45, -10] : [-5.2, 0.55, -10]}
                rotation={[0, 0.2, 0]}
                texturePath={BUDGET_OPTIONS[0].texture}
                paintedTexturePath={BUDGET_OPTIONS[0].paintedTexture}
                isSelected={selectedBudget === BUDGET_OPTIONS[0].value}
                label={BUDGET_OPTIONS[0].label}
                onClick={() => handleBudgetSelect(BUDGET_OPTIONS[0].value)}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
                scale={isMobile ? [1.8, 1.95] : [2.12, 2.3]}
            />

            {/* ₹1–2 LAKHS */}
            <SocialBarrel
                position={isMobile ? [-1.25, -0.35, -7.3] : [-2.7, -0.25, -8]}
                rotation={[0, 0.25, 0]}
                texturePath={BUDGET_OPTIONS[1].texture}
                paintedTexturePath={BUDGET_OPTIONS[1].paintedTexture}
                isSelected={selectedBudget === BUDGET_OPTIONS[1].value}
                label={BUDGET_OPTIONS[1].label}
                onClick={() => handleBudgetSelect(BUDGET_OPTIONS[1].value)}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
                scale={isMobile ? [1.8, 1.95] : [2.12, 2.3]}
            />

            {/* ₹2–3 LAKHS */}
            <SocialBarrel
                position={isMobile ? [0, 0.55, -11] : [0, 0.6, -11]}
                rotation={[0, 0, 0]}
                texturePath={BUDGET_OPTIONS[2].texture}
                paintedTexturePath={BUDGET_OPTIONS[2].paintedTexture}
                isSelected={selectedBudget === BUDGET_OPTIONS[2].value}
                label={BUDGET_OPTIONS[2].label}
                onClick={() => handleBudgetSelect(BUDGET_OPTIONS[2].value)}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
                scale={isMobile ? [1.8, 1.95] : [2.12, 2.3]}
            />

            {/* ₹3–5 LAKHS */}
            <SocialBarrel
                position={isMobile ? [1.25, -0.35, -7.3] : [2.7, -0.25, -8]}
                rotation={[0, -0.25, 0]}
                texturePath={BUDGET_OPTIONS[3].texture}
                paintedTexturePath={BUDGET_OPTIONS[3].paintedTexture}
                isSelected={selectedBudget === BUDGET_OPTIONS[3].value}
                label={BUDGET_OPTIONS[3].label}
                onClick={() => handleBudgetSelect(BUDGET_OPTIONS[3].value)}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
                scale={isMobile ? [1.8, 1.95] : [2.12, 2.3]}
            />

            {/* ₹5 LAKHS+ */}
            <SocialBarrel
                position={isMobile ? [1.15, 0.45, -10] : [5.2, 0.55, -10]}
                rotation={[0, -0.2, 0]}
                texturePath={BUDGET_OPTIONS[4].texture}
                paintedTexturePath={BUDGET_OPTIONS[4].paintedTexture}
                isSelected={selectedBudget === BUDGET_OPTIONS[4].value}
                label={BUDGET_OPTIONS[4].label}
                onClick={() => handleBudgetSelect(BUDGET_OPTIONS[4].value)}
                paintOnBeforeCompile={onBeforeCompile}
                paintUniforms={uniformsData}
                scale={isMobile ? [1.8, 1.95] : [2.12, 2.3]}
            />

            {/* 🏖️ DOCK / MOLO */}
            <mesh
                position={[0, 0.05, 1.8]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <planeGeometry args={[2.5, 7]} />

                <meshBasicMaterial
                    map={moloTexture}
                    color="#e0e0e0"
                    roughness={0.8}
                    side={THREE.DoubleSide}
                    transparent
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            {/* 🗼 LATARNIA (LIGHTHOUSE) */}
            <mesh
                position={LATARNIA_SETTINGS.position}
                rotation={LATARNIA_SETTINGS.rotation}
            >
                <planeGeometry args={LATARNIA_SETTINGS.scale} />

                <meshBasicMaterial
                    color="#e0e0e0"
                    map={latarniaTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            {/* 🚢 STATEK (SHIP) */}
            <mesh
                ref={statekRef}
                position={STATEK_SETTINGS.position}
                rotation={STATEK_SETTINGS.rotation}
            >
                <planeGeometry args={STATEK_SETTINGS.scale} />

                <meshBasicMaterial
                    color="#e0e0e0"
                    map={statekTexture}
                    transparent
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    onBeforeCompile={onBeforeCompile}
                />
            </mesh>

            {/* 📜 INTERACTIVE MESSAGE PAPER */}
            {/* Kept from the original room.
                It is disabled for the budget journey so it cannot interfere
                with the budget selection experience.
            */}
            <group visible={false}>
                <MessagePaper
                    position={[0, 0.07, 2]}
                    onSend={(data) => {
                        // console.log('📬 Contact form submitted:', data);
                        unlockAchievement('contact_submit');
                    }}
                />
            </group>

        </group>
    );
};

export default ContactRoom;