import { useState, useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';

import InfiniteCorridorManager from './corridor/InfiniteCorridorManager';
import EntranceDoors from './entrance/EntranceDoors';
import EmptyCorridor from './entrance/EmptyCorridor';
import TeleportRoom from './corridor/TeleportRoom';
import RoomWarmup from './corridor/RoomWarmup';
import useInfiniteCamera from '../../hooks/useInfiniteCamera';
import SignSystem from './entrance/SignSystem';
import { useScene } from '../../context/SceneContext';

// Positioning:
// - Segment -1's SegmentDoors are at Z=15
// - Entrance doors at Z=22 (in front of segment doors)
// - ITOM/Avatar at Z≈5.5
// - Camera starts at Z=28, ends at Z=8 (in front of avatar)
const ENTRANCE_DOORS_Z = 22;

// Initial corridor introduction
// Gallery door in segment 0:
// segment zOffset = 10
// gallery relativeZ = -18
// actual DoorSection position = 10 + (-18) + 2 = -6
const GALLERY_DOOR_Z = -1;
const INTRO_DELAY = 1000;
const INTRO_MOVE_DURATION = 2.5;
const GALLERY_AUTO_CLICK_DELAY = 1000;

// Camera stopping points are five units in front of each door in segment 0.
// Keep these aligned with CorridorSegment's door positions and the journey order.
const JOURNEY_DOOR_STOP_Z = {
    gallery: -1,
    studio: -15,
    contact: -45,
    about: -31
};
const NEXT_DOOR_MOVE_DURATION = 2.5;

// After the camera arrives in front of the next required door, wait this long
// (ms) and then tell that door to open itself.
const JOURNEY_ARRIVAL_PAUSE = 500;

// IMPORTANT: this string must be identical to the one in DoorSection.jsx.
const JOURNEY_DOOR_ARRIVED_EVENT = 'journey-door-arrived';

/**
 * Experience Component
 * 
 * Flow:
 * 1. Preloader fades out -> user sees 3D entrance doors
 * 2. Click doors -> they open + camera flies through
 * 3. Behind doors: infinite corridor with ITOM
 * 4. User gets control immediately after entering
 * 5. After 1 second, camera automatically moves toward Gallery
 * 6. Camera stops at Gallery door and control returns to user
 * 7. After each journey room is completed and exited, the camera glides to the
 *    next required door and that door opens + enters automatically
 */
const Experience = ({ isLoaded, onSceneReady, performanceTier }) => {
    // Use SceneContext for room state
    const {
        hasEntered,
        markEntered,
        enterRoom,
        isTeleporting,
        isInRoom,
        currentRoom,
        nextRequiredRoom,
        isRoomCompleted
    } = useScene();

    const { camera } = useThree();

    // One-time post-entrance introduction
    const introTimerRef = useRef(null);
    const introAnimationRef = useRef(null);
    const introHasStartedRef = useRef(false);

    const galleryAutoClickTimerRef = useRef(null);
    const galleryAutoClickCancelledRef = useRef(false);
    const initialGalleryAutoTriggerConsumedRef = useRef(false);
    const journeyMoveAnimationRef = useRef(null);
    const journeyArrivalTimerRef = useRef(null);
    const previousRoomRef = useRef(null);
    const lastJourneyMoveTargetRef = useRef(null);

    // Latest values for use inside timers (avoids stale closures).
    const isTeleportingRef = useRef(isTeleporting);
    const isInRoomRef = useRef(isInRoom);
    isTeleportingRef.current = isTeleporting;
    isInRoomRef.current = isInRoom;

    const [autoTriggerGallery, setAutoTriggerGallery] = useState(false);
    const [introFinished, setIntroFinished] = useState(false);
    // Camera control - both scroll and parallax only work after entering
    // Disable during teleporting to prevent scroll interference
    const { setCameraOverride } = useInfiniteCamera({
        segmentLength: 80,
        scrollSpeed: 0.025,
        parallaxIntensity: 0.4,
        smoothing: 0.06,
        scrollEnabled: hasEntered && !isTeleporting && !isInRoom,
        parallaxEnabled: hasEntered && !isTeleporting && !isInRoom
    });

    // NOTE: Camera override is now managed directly by DoorSection.jsx
    // We removed the useEffect that was calling setCameraOverride here because
    // it conflicted with DoorSection's direct control and caused camera jumps.
    // The scrollEnabled/parallaxEnabled props already handle disabling scroll when in room.

    // Handle entrance complete
    const handleEntranceComplete = useCallback(() => {
        markEntered();
    }, [markEntered]);

    // Handle door enter from inside corridor
    const handleDoorEnter = useCallback((doorId) => {
        enterRoom(doorId);
        // console.log('Entering:', doorId);
    }, [enterRoom]);

    const handleGalleryAutoTriggerHandled = useCallback(() => {
        // DoorSection has consumed the initial Gallery trigger. Keep it consumed
        // so exiting the Gallery can never cause it to reopen automatically.
        initialGalleryAutoTriggerConsumedRef.current = true;
        setAutoTriggerGallery(false);
    }, []);

    // Automatic first corridor introduction
    // User has normal movement immediately after entering.
    // After 1 second, camera moves forward toward the Gallery door.
    useEffect(() => {
        // Only start this sequence after the entrance has been completed.
        if (!hasEntered) return;

        // This introduction should happen only once.
        if (introHasStartedRef.current) return;

        introTimerRef.current = setTimeout(() => {
            // Consume this introduction attempt even if the user has already
            // entered a room or started teleporting. It must not run after exit.
            introHasStartedRef.current = true;

            // Do not start if the user has already entered a room.
            if (isTeleporting || isInRoom) return;

            // Current camera position may have changed because the user
            // was allowed to move during the 1-second free-control period.
            const currentCameraZ = camera.position.z;

            // Only move forward.
            // If the user has already moved to/past the Gallery door,
            // never move the camera backwards.
            if (currentCameraZ <= GALLERY_DOOR_Z) {
                return;
            }

            // Stop normal infinite-camera updates while GSAP controls
            // the forward introduction movement.
            setCameraOverride(true);

            introAnimationRef.current = gsap.to(camera.position, {
                z: GALLERY_DOOR_Z,
                duration: INTRO_MOVE_DURATION,
                ease: 'power2.inOut',
                onComplete: () => {
                    // Give control back to the normal infinite camera.
                    setCameraOverride(false);
                    introAnimationRef.current = null;
                    setIntroFinished(true);
                }
            });
        }, INTRO_DELAY);

        return () => {
            if (introTimerRef.current) {
                clearTimeout(introTimerRef.current);
                introTimerRef.current = null;
            }

            if (introAnimationRef.current) {
                introAnimationRef.current.kill();
                introAnimationRef.current = null;
            }
        };
    }, [
        hasEntered,
        isTeleporting,
        isInRoom,
        camera,
        setCameraOverride
    ]);



    // Trigger the first Gallery visit at most once. This is deliberately
    // separate from the camera introduction: once the user enters a room or
    // the trigger is consumed/cancelled, it must never be scheduled again.
    useEffect(() => {
        if (!hasEntered || !introFinished) return;

        // If any room has been entered, the initial Gallery auto-visit window
        // is closed permanently. This also prevents re-triggering after exit.
        if (isInRoom) {
            initialGalleryAutoTriggerConsumedRef.current = true;
            return;
        }

        if (initialGalleryAutoTriggerConsumedRef.current) return;
        if (isTeleporting || introAnimationRef.current) return;

        galleryAutoClickCancelledRef.current = false;

        const removeUserInteractionListeners = () => {
            window.removeEventListener('pointerdown', handleUserInteraction);
            window.removeEventListener('pointermove', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            window.removeEventListener('wheel', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
        };

        const handleUserInteraction = () => {
            galleryAutoClickCancelledRef.current = true;
            initialGalleryAutoTriggerConsumedRef.current = true;

            if (galleryAutoClickTimerRef.current) {
                clearTimeout(galleryAutoClickTimerRef.current);
                galleryAutoClickTimerRef.current = null;
            }

            removeUserInteractionListeners();
        };

        window.addEventListener('pointerdown', handleUserInteraction);
        window.addEventListener('pointermove', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);
        window.addEventListener('wheel', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);

        galleryAutoClickTimerRef.current = setTimeout(() => {
            galleryAutoClickTimerRef.current = null;

            if (galleryAutoClickCancelledRef.current) return;
            if (isTeleporting || isInRoom) return;

            // Consume before setting state so a rerender cannot schedule it again.
            initialGalleryAutoTriggerConsumedRef.current = true;
            setAutoTriggerGallery(true);
            removeUserInteractionListeners();
        }, GALLERY_AUTO_CLICK_DELAY);

        return () => {
            if (galleryAutoClickTimerRef.current) {
                clearTimeout(galleryAutoClickTimerRef.current);
                galleryAutoClickTimerRef.current = null;
            }

            galleryAutoClickCancelledRef.current = true;
            removeUserInteractionListeners();
        };
    }, [
        hasEntered,
        introFinished,
        isTeleporting,
        isInRoom
    ]);

    // Remember which room was just exited. Once its answer is complete, glide
    // the camera to the next required door. When the camera arrives we keep the
    // camera override ON and tell that door (via a window event) to open itself,
    // exactly like the Gallery door does. The door's own handleClick then takes
    // over the camera, so nothing here can fight with the fly-through.
    //
    // Keeping previousRoomRef until completion is confirmed also handles a
    // room that saves its answer just after the exit state changes.
    useEffect(() => {
        if (currentRoom !== null) {
            previousRoomRef.current = currentRoom;
            return;
        }

        const exitedRoom = previousRoomRef.current;
        if (!exitedRoom) return;
        if (!isRoomCompleted(exitedRoom)) return;

        previousRoomRef.current = null;

        if (!nextRequiredRoom) return;
        const targetZ = JOURNEY_DOOR_STOP_Z[nextRequiredRoom];
        if (typeof targetZ !== 'number') return;
        if (!hasEntered || isTeleporting) return;

        // Avoid replaying the same movement if unrelated context state changes.
        const moveKey = `${exitedRoom}->${nextRequiredRoom}`;
        if (lastJourneyMoveTargetRef.current === moveKey) return;
        lastJourneyMoveTargetRef.current = moveKey;

        if (journeyMoveAnimationRef.current) {
            journeyMoveAnimationRef.current.kill();
            journeyMoveAnimationRef.current = null;
        }

        if (journeyArrivalTimerRef.current) {
            clearTimeout(journeyArrivalTimerRef.current);
            journeyArrivalTimerRef.current = null;
        }

        // Capture the room we are travelling to (nextRequiredRoom may change later).
        const arrivingRoom = nextRequiredRoom;

        setCameraOverride(true);
        journeyMoveAnimationRef.current = gsap.to(camera.position, {
            z: targetZ,
            duration: NEXT_DOOR_MOVE_DURATION,
            ease: 'power2.inOut',
            onComplete: () => {
                journeyMoveAnimationRef.current = null;

                // Do NOT release the camera override here. If we did, the infinite
                // camera hook would immediately start rewriting the camera every
                // frame and overwrite the door's fly-through.
                journeyArrivalTimerRef.current = setTimeout(() => {
                    journeyArrivalTimerRef.current = null;

                    // If the user started a teleport or entered a room in the
                    // meantime, the door/teleport logic owns the camera now.
                    if (isTeleportingRef.current || isInRoomRef.current) return;

                    const detail = { roomId: arrivingRoom, handled: false };
                    window.dispatchEvent(
                        new CustomEvent(JOURNEY_DOOR_ARRIVED_EVENT, { detail })
                    );

                    // dispatchEvent is synchronous: if no door picked the event up,
                    // give the camera back so the user is never stuck.
                    if (!detail.handled) {
                        setCameraOverride(false);
                    }
                }, JOURNEY_ARRIVAL_PAUSE);
            },
            onInterrupt: () => {
                journeyMoveAnimationRef.current = null;
                setCameraOverride(false);
            }
        });
    }, [
        currentRoom,
        hasEntered,
        isTeleporting,
        nextRequiredRoom,
        isRoomCompleted,
        camera,
        setCameraOverride
    ]);

    useEffect(() => {
        return () => {
            if (introTimerRef.current) {
                clearTimeout(introTimerRef.current);
                introTimerRef.current = null;
            }
            if (galleryAutoClickTimerRef.current) {
                clearTimeout(galleryAutoClickTimerRef.current);
                galleryAutoClickTimerRef.current = null;
            }
            if (journeyArrivalTimerRef.current) {
                clearTimeout(journeyArrivalTimerRef.current);
                journeyArrivalTimerRef.current = null;
            }
            if (introAnimationRef.current) {
                introAnimationRef.current.kill();
                introAnimationRef.current = null;
            }
            if (journeyMoveAnimationRef.current) {
                journeyMoveAnimationRef.current.kill();
                journeyMoveAnimationRef.current = null;
            }
        };
    }, []);
    // Optimization: Low tier has simpler lighting
    const isLowTier = performanceTier === 'LOW';

    return (
        <>
            {/* === ROOM WARM-UP (pre-renders all rooms off-screen during preloader) === */}
            {/* RoomWarmup mounts all 4 rooms 500 units below, compiles shaders via gl.compile(), 
                then self-destructs and signals onSceneReady. This ensures both corridor segments
                AND room shaders are pre-compiled before the user starts interacting. */}
            <RoomWarmup onWarmupComplete={onSceneReady} isLowTier={isLowTier} />

            {/* === GLOBAL LIGHTING === */}
            {/* <ambientLight intensity={isLowTier ? 2.5 : 2.2} /> */}
            {/* <directionalLight
                position={[5, 10, 5]}
                intensity={0.8}
                color="#acacac"
                castShadow={!isLowTier}
                shadow-mapSize={[1024, 1024]}
            /> */}
            {/* <directionalLight position={[-5, 8, -10]} intensity={0.4} color="#ffffff" /> */}

            {/* === EMPTY CORRIDOR (provides context during entrance) === */}
            {!hasEntered && (
                <EmptyCorridor camera={camera} />
            )}

            {/* === ENTRANCE DOORS (visible until entered) === */}
            {!hasEntered && (
                <EntranceDoors 
                    position={[0, 0, ENTRANCE_DOORS_Z]} 
                    onComplete={handleEntranceComplete}
                    isLoaded={isLoaded}
                />
            )}

            {/* Separate SignSystem to avoid fragment nesting issues if any */}
            {!hasEntered && (
                <SignSystem position={[0, 0, ENTRANCE_DOORS_Z]} />
            )}

            {/* === INFINITE CORRIDOR (segment -1 SegmentDoors hidden during entrance) === */}
            <InfiniteCorridorManager
                onDoorEnter={handleDoorEnter}
                hideDoorsForSegments={hasEntered ? [] : [-1]}
                clipSegmentNeg1={!hasEntered}
                setCameraOverride={setCameraOverride}
                autoTriggerGallery={autoTriggerGallery}
                onGalleryAutoTriggerHandled={handleGalleryAutoTriggerHandled}
            />

            {/* === TELEPORT ROOM (renders room directly during teleportation) === */}
            <TeleportRoom />
        </>
    );
};

export default Experience;