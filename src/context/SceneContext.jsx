
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    useRef
} from 'react';

import { getInitialRoomFromUrl } from '../hooks/useDocumentMeta';

const SceneContext = createContext(null);

// The required order of the lead-generation journey.
const JOURNEY_ROOMS = [
    'gallery',
    'studio',
    'contact',
    'about'
];

const JOURNEY_STORAGE_KEY = 'mbaJourneyAnswers';

// Configure this in the frontend environment:
// VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
const GOOGLE_APPS_SCRIPT_URL =
    import.meta.env?.VITE_MBA_APPS_SCRIPT_URL || '';

const hasMeaningfulAnswer = (answer) => {
    if (answer === null || answer === undefined) return false;
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (typeof answer === 'number') return Number.isFinite(answer);
    if (typeof answer === 'boolean') return true;
    if (Array.isArray(answer)) return answer.some(hasMeaningfulAnswer);
    if (typeof answer === 'object') {
        return Object.values(answer).some(hasMeaningfulAnswer);
    }
    return false;
};

// Safely read the saved journey from sessionStorage.
const getSavedJourney = () => {
    const emptyJourney = {
        answers: {},
        completedRooms: []
    };

    try {
        if (typeof window === 'undefined') {
            return emptyJourney;
        }

        const saved = window.sessionStorage.getItem(
            JOURNEY_STORAGE_KEY
        );

        if (!saved) {
            return emptyJourney;
        }

        const parsed = JSON.parse(saved);

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return emptyJourney;
        }

        // Accept both the flat answer map used by room components and the
        // wrapped shape written by earlier versions of this context.
        const sourceAnswers =
            parsed.answers &&
            typeof parsed.answers === 'object' &&
            !Array.isArray(parsed.answers)
                ? parsed.answers
                : parsed;

        const answers = Object.fromEntries(
            JOURNEY_ROOMS.map((roomId) => [roomId, sourceAnswers[roomId] ?? null])
        );
        const completedRooms = JOURNEY_ROOMS.filter((roomId) =>
            hasMeaningfulAnswer(answers[roomId])
        );

        return { answers, completedRooms };
    } catch (error) {
        console.error(
            'Could not restore journey progress:',
            error
        );

        return emptyJourney;
    }
};

// Persist answers and completion status together.
const persistJourney = (journey) => {
    try {
        if (typeof window === 'undefined') {
            return;
        }

        window.sessionStorage.setItem(
            JOURNEY_STORAGE_KEY,
            JSON.stringify(journey.answers)
        );
    } catch (error) {
        console.error(
            'Could not save journey progress:',
            error
        );
    }
};

export const useScene = () => {
    const context = useContext(SceneContext);

    if (!context) {
        throw new Error(
            'useScene must be used within a SceneProvider'
        );
    }

    return context;
};

export const SceneProvider = ({ children }) => {
    // Deep linking: check if URL points to a specific room on first load.
    const initialRoom = useRef(getInitialRoomFromUrl());
    const deeplinkHandled = useRef(false);

    const [currentRoom, setCurrentRoom] = useState(null);
    const [hasEntered, setHasEntered] = useState(false);
    const [exitRequested, setExitRequested] = useState(false);
    const [overlayContent, setOverlayContent] = useState(null);

    // ---------------------------------------------------------
    // JOURNEY STATE
    // ---------------------------------------------------------

    // Answers and completed rooms are stored together so they
    // remain consistent when the user moves between rooms.
    const [journey, setJourney] = useState(getSavedJourney);
    const [sheetSubmissionStatus, setSheetSubmissionStatus] = useState('idle');
    const sheetSubmissionStarted = useRef(false);

    const journeyAnswers = journey.answers;
    const completedRooms = journey.completedRooms;

    // The first room without a saved answer is the next required room.
    const nextRequiredRoom = useMemo(() => {
        return (
            JOURNEY_ROOMS.find(
                (roomId) => !completedRooms.includes(roomId)
            ) ?? null
        );
    }, [completedRooms]);

    // The journey is complete only when all four rooms are complete.
    const isJourneyComplete = useMemo(() => {
        return JOURNEY_ROOMS.every((roomId) =>
            completedRooms.includes(roomId)
        );
    }, [completedRooms]);

    // Shared room-ID check used by DoorSection and other navigation.
    const isJourneyRoom = useCallback((roomId) => {
        return JOURNEY_ROOMS.includes(roomId);
    }, []);

    const isRoomComplete = useCallback((roomId) => {
        return completedRooms.includes(roomId);
    }, [completedRooms]);

    // A room is accessible if it is the next required room,
    // or a room the user has already completed.
    //
    // Unknown room IDs are not part of this journey and are blocked.
    const canEnterRoom = useCallback((roomId) => {
        const requestedIndex = JOURNEY_ROOMS.indexOf(roomId);

        if (requestedIndex === -1) {
            return false;
        }

        // Once every room is complete, all journey rooms are accessible.
        if (isJourneyComplete) {
            return true;
        }

        // Previously completed rooms may be revisited.
        if (completedRooms.includes(roomId)) {
            return true;
        }

        // Only the next incomplete room may be entered.
        return roomId === nextRequiredRoom;
    }, [
        completedRooms,
        isJourneyComplete,
        nextRequiredRoom
    ]);

    // Save the answer for the room currently being completed.
    //
    // A valid answer also marks that room as completed.
    // Returns false if the room is not allowed, is not active,
    // or the answer is empty.
    const submitJourneyToSheet = useCallback(async (profile) => {
        if (!GOOGLE_APPS_SCRIPT_URL) {
            setSheetSubmissionStatus('not-configured');
            throw new Error(
                'Google Sheets submission is not configured. Add VITE_MBA_APPS_SCRIPT_URL to the frontend .env file.'
            );
        }

        const completeAnswers = {
            ...journeyAnswers,
            about: profile
        };

        const missingRooms = JOURNEY_ROOMS.filter((roomId) =>
            !hasMeaningfulAnswer(completeAnswers[roomId])
        );

        if (missingRooms.length > 0) {
            throw new Error(
                `Please complete the earlier journey steps first: ${missingRooms.join(', ')}.`
            );
        }

        if (sheetSubmissionStarted.current) {
            throw new Error('This journey has already been submitted.');
        }

        sheetSubmissionStarted.current = true;
        setSheetSubmissionStatus('sending');

        const payload = {
            timestamp: new Date().toISOString(),
            source: 'interactive-mba-journey',
            specialization: completeAnswers.gallery,
            interest: completeAnswers.gallery,
            educationLevel: completeAnswers.studio,
            budget: completeAnswers.contact,
            name: profile?.name ?? '',
            phone: profile?.phone ?? '',
            email: profile?.email ?? '',
            state: profile?.state ?? '',
            city: profile?.city ?? '',
            profile: completeAnswers.about,
            answers: completeAnswers
        };

        try {
            // The opaque no-cors response cannot verify the actual sheet write.
            await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload),
                keepalive: true
            });

            setSheetSubmissionStatus('sent');
            return payload;
        } catch (error) {
            sheetSubmissionStarted.current = false;
            setSheetSubmissionStatus('failed');
            console.error('Google Sheets submission failed:', error);
            throw error;
        }
    }, [journeyAnswers]);

    // Save the answer for the active room and persist the combined journey
    // in sessionStorage. About submits the completed payload through
    // submitJourneyToSheet before saving its final profile answer.
    const saveRoomAnswer = useCallback((roomId, answer) => {
        if (!isJourneyRoom(roomId)) return false;
        if (currentRoom !== roomId) return false;
        if (!canEnterRoom(roomId)) return false;
        if (!hasMeaningfulAnswer(answer)) return false;

        const updatedJourney = {
            answers: {
                ...journeyAnswers,
                [roomId]: answer
            },
            completedRooms: JOURNEY_ROOMS.filter((journeyRoomId) =>
                hasMeaningfulAnswer({
                    ...journeyAnswers,
                    [roomId]: answer
                }[journeyRoomId])
            )
        };

        setJourney(updatedJourney);
        persistJourney(updatedJourney);

        return true;
    }, [
        isJourneyRoom,
        currentRoom,
        canEnterRoom,
        journeyAnswers,
        completedRooms
    ]);

    // ---------------------------------------------------------
    // TELEPORTATION STATE
    // ---------------------------------------------------------

    const [teleportTarget, setTeleportTarget] = useState(null);
    const [isTeleporting, setIsTeleporting] = useState(false);
    const [teleportPhase, setTeleportPhase] = useState(null);
    const [pendingDoorClick, setPendingDoorClick] = useState(null);
    const [isFastTeleport, setIsFastTeleport] = useState(false);

    // ---------------------------------------------------------
    // ROOM ENTRY AND EXIT
    // ---------------------------------------------------------

    const enterRoom = useCallback((roomId) => {
        // Enforce the journey order at the context level.
        // DoorSection must also check permissions before starting
        // its camera and door animations.
        if (!canEnterRoom(roomId)) {
            return false;
        }

        setCurrentRoom(roomId);
        setExitRequested(false);
        setOverlayContent(null);

        // Preserve the existing teleportation cleanup.
        // isFastTeleport is cleared by signalRoomReady.
        // Do not clear teleportPhase while the opening animation
        // is still running.
        setIsTeleporting(false);
        setPendingDoorClick(null);

        return true;
    }, [canEnterRoom]);

    const exitRoom = useCallback(() => {
        setCurrentRoom(null);
        setExitRequested(false);
        setOverlayContent(null);
    }, []);

    // Request exit - this signals to DoorSection to trigger exit animation.
    const requestExit = useCallback(() => {
        setExitRequested(true);
        setOverlayContent(null);
    }, []);

    // Clear exit request - called by DoorSection after handling.
    const clearExitRequest = useCallback(() => {
        setExitRequested(false);
    }, []);

    const markEntered = useCallback(() => {
        setHasEntered(true);
    }, []);

    // ---------------------------------------------------------
    // OVERLAY
    // ---------------------------------------------------------

    const openOverlay = useCallback((content) => {
        setOverlayContent(content);
    }, []);

    const closeOverlay = useCallback(() => {
        setOverlayContent(null);
    }, []);

    // ---------------------------------------------------------
    // TELEPORTATION FUNCTIONS
    // ---------------------------------------------------------

    // Initiate teleport - called when user clicks a room on the map.
    const teleportTo = useCallback((roomId) => {
        if (isTeleporting || roomId === currentRoom) {
            return;
        }

        // Prevent teleporting directly into a later room. Instead, send the
        // user toward the next required room so the journey cannot be skipped.
        if (!canEnterRoom(roomId)) {
            if (
                nextRequiredRoom &&
                isJourneyRoom(nextRequiredRoom) &&
                canEnterRoom(nextRequiredRoom)
            ) {
                setTeleportTarget(nextRequiredRoom);
                setIsTeleporting(true);
                setIsFastTeleport(true);
                setTeleportPhase('closing');
                setOverlayContent(null);
            }
            return;
        }

        setTeleportTarget(roomId);
        setIsTeleporting(true);
        setIsFastTeleport(true);
        setTeleportPhase('closing');
        setOverlayContent(null);
    }, [
        isTeleporting,
        currentRoom,
        canEnterRoom,
        nextRequiredRoom,
        isJourneyRoom
    ]);

    // Called when the paper-close animation completes.
    const startTeleportTransition = useCallback(() => {
        setTeleportPhase('teleporting');
    }, []);

    // Called when teleport is ready and the paper can open.
    const openTeleportTransition = useCallback(() => {
        setTeleportPhase('opening');
    }, []);

    // Called when the paper transition completes.
    const completeTeleport = useCallback(() => {
        // Preserve the existing fast-teleport sequence.
        // DoorSection handles the pending room entry.
        setPendingDoorClick(teleportTarget);

        setTeleportTarget(null);
    }, [teleportTarget]);

    // Called by DoorSection when camera entry finishes during fast teleport.
    const signalRoomReady = useCallback(() => {
        if (isFastTeleport) {
            setTeleportPhase('opening');
            setIsFastTeleport(false);
        }
    }, [isFastTeleport]);

    // Called when the paper-open animation finishes.
    const finishPaperOpen = useCallback(() => {
        setTeleportPhase(null);
    }, []);

    // Cancel teleport in case of an error.
    const cancelTeleport = useCallback(() => {
        setTeleportTarget(null);
        setIsTeleporting(false);
        setTeleportPhase(null);
        setPendingDoorClick(null);
        setIsFastTeleport(false);
    }, []);

    const getRoomAnswer = useCallback((roomId) => {
        if (!isJourneyRoom(roomId)) return null;
        return journeyAnswers[roomId] ?? null;
    }, [isJourneyRoom, journeyAnswers]);

    const resetJourney = useCallback(() => {
        const emptyJourney = { answers: {}, completedRooms: [] };
        setJourney(emptyJourney);
        persistJourney(emptyJourney);
        sheetSubmissionStarted.current = false;
        setSheetSubmissionStatus('idle');
    }, []);

    // ---------------------------------------------------------
    // CONTEXT VALUE
    // ---------------------------------------------------------

    const value = useMemo(() => ({
        // Existing room state
        currentRoom,
        hasEntered,
        exitRequested,
        overlayContent,

        // Existing room functions
        enterRoom,
        exitRoom,
        requestExit,
        clearExitRequest,
        markEntered,
        openOverlay,
        closeOverlay,

        isInRoom: currentRoom !== null,

        // Deep linking
        initialRoom: initialRoom.current,
        deeplinkHandled,

        // Journey progress
        journeyRooms: JOURNEY_ROOMS,
        journeyAnswers,
        completedRooms,
        nextRequiredRoom,
        isJourneyComplete,
        isJourneyRoom,
        isRoomComplete,
        isRoomCompleted: isRoomComplete,
        canEnterRoom,
        saveRoomAnswer,
        getRoomAnswer,
        resetJourney,
        sheetSubmissionStatus,
        submitJourneyToSheet,
        submitJourneyToGoogleSheet: submitJourneyToSheet,

        // Teleportation
        teleportTarget,
        isTeleporting,
        teleportPhase,
        pendingDoorClick,
        isFastTeleport,
        teleportTo,
        startTeleportTransition,
        openTeleportTransition,
        completeTeleport,
        signalRoomReady,
        finishPaperOpen,
        cancelTeleport
    }), [
        currentRoom,
        hasEntered,
        exitRequested,
        overlayContent,

        enterRoom,
        exitRoom,
        requestExit,
        clearExitRequest,
        markEntered,
        openOverlay,
        closeOverlay,

        journeyAnswers,
        completedRooms,
        nextRequiredRoom,
        isJourneyComplete,
        isJourneyRoom,
        isRoomComplete,
        canEnterRoom,
        saveRoomAnswer,
        getRoomAnswer,
        resetJourney,
        sheetSubmissionStatus,
        submitJourneyToSheet,

        teleportTarget,
        isTeleporting,
        teleportPhase,
        pendingDoorClick,
        isFastTeleport,
        teleportTo,
        startTeleportTransition,
        openTeleportTransition,
        completeTeleport,
        signalRoomReady,
        finishPaperOpen,
        cancelTeleport
    ]);

    return (
        <SceneContext.Provider value={value}>
            {children}
        </SceneContext.Provider>
    );
};

export default SceneContext;