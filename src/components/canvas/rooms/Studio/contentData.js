/**
 * Studio Education Level Data
 *
 * This file contains all education-level items for the Studio
 * monitor tower.
 *
 * Each item is displayed on a monitor / TV / phone in the tower
 * and can be selected as part of the MBA lead journey.
 *
 * Education Levels:
 * - School
 * - Pursuing Bachelor's
 * - Graduate
 * - PG
 * - Master's
 * - Working
 * - Other
 */

export const PLATFORM_CONFIG = {
    school: {
        color: '#4A90D9',
        accentColor: '#2d6cb5',
        icon: 'S',
        label: 'School',
        shape: 'tv',
    },

    pursuingBachelor: {
        color: '#5B8DEF',
        accentColor: '#4169C1',
        icon: 'B',
        label: "Pursuing Bachelor's",
        shape: 'monitor',
    },

    graduate: {
        color: '#34A853',
        accentColor: '#188038',
        icon: 'G',
        label: 'Graduate',
        shape: 'monitor',
    },

    pg: {
        color: '#9C6ADE',
        accentColor: '#7442A8',
        icon: 'PG',
        label: 'PG',
        shape: 'phone',
    },

    masters: {
        color: '#F4B400',
        accentColor: '#C88A00',
        icon: 'M',
        label: "Master's",
        shape: 'tv',
    },

    working: {
        color: '#E67E22',
        accentColor: '#C45F0A',
        icon: 'W',
        label: 'Working',
        shape: 'monitor',
    },

    other: {
        color: '#777777',
        accentColor: '#555555',
        icon: 'O',
        label: 'Other',
        shape: 'phone',
    },
};

const RAW_CONTENT_DATA = [
    // =========================================================
    // SCHOOL
    // =========================================================

    {
        id: 'education-school',
        platform: 'school',
        title: 'SCHOOL',
        description:
            'Currently studying in school and exploring future higher-education and MBA pathways.',
        frontTexture: '/textures/studio/education_school.png',
        paintedFrontTexture:
            '/textures/studio/education_school_painted.png',
        thumbnail: null,
        date: '2026-01-01',
    },

    // =========================================================
    // PURSUING BACHELOR'S
    // =========================================================

    {
        id: 'education-pursuing-bachelor',
        platform: 'pursuingBachelor',
        title: "PURSUING BACHELOR'S",
        description:
            "Currently pursuing a Bachelor's degree and planning the next step in higher education.",
        frontTexture:
            '/textures/studio/education_pursuing_bachelor.png',
        paintedFrontTexture:
            '/textures/studio/education_pursuing_bachelor_painted.png',
        thumbnail: null,
        date: '2026-01-02',
    },

    // =========================================================
    // GRADUATE
    // =========================================================

    {
        id: 'education-graduate',
        platform: 'graduate',
        title: 'GRADUATE',
        description:
            "Completed a Bachelor's degree and looking to build the next stage of an academic or professional career.",
        frontTexture: '/textures/studio/education_graduate.png',
        paintedFrontTexture:
            '/textures/studio/education_graduate_painted.png',
        thumbnail: null,
        date: '2026-01-03',
    },

    // =========================================================
    // PG
    // =========================================================

    {
        id: 'education-pg',
        platform: 'pg',
        title: 'PG',
        description:
            'Currently pursuing or holding a postgraduate qualification and exploring further education opportunities.',
        frontTexture: '/textures/studio/education_pg.png',
        paintedFrontTexture:
            '/textures/studio/education_pg_painted.png',
        thumbnail: null,
        date: '2026-01-04',
    },

    // =========================================================
    // MASTER'S
    // =========================================================

    {
        id: 'education-masters',
        platform: 'masters',
        title: "MASTER'S",
        description:
            "Completed or currently pursuing a Master's degree and considering an MBA as the next career step.",
        frontTexture: '/textures/studio/education_masters.png',
        paintedFrontTexture:
            '/textures/studio/education_masters_painted.png',
        thumbnail: null,
        date: '2026-01-05',
    },

    // =========================================================
    // WORKING
    // =========================================================

    {
        id: 'education-working',
        platform: 'working',
        title: 'WORKING',
        description:
            'Currently working and looking to strengthen professional skills, career growth, or management opportunities.',
        frontTexture: '/textures/studio/education_working.png',
        paintedFrontTexture:
            '/textures/studio/education_working_painted.png',
        thumbnail: null,
        date: '2026-01-06',
    },

    // =========================================================
    // OTHER
    // =========================================================

    {
        id: 'education-other',
        platform: 'other',
        title: 'OTHER',
        description:
            'A different educational background or current situation that does not fit the listed categories.',
        frontTexture: '/textures/studio/education_other.png',
        paintedFrontTexture:
            '/textures/studio/education_other_painted.png',
        thumbnail: null,
        date: '2026-01-07',
    },
];

// =============================================================
// FINAL CONTENT DATA
// =============================================================

export const CONTENT_DATA = RAW_CONTENT_DATA.map((item) => ({
    ...item,
    platformConfig: PLATFORM_CONFIG[item.platform],
    frontTexture: item.frontTexture,
    paintedFrontTexture: item.paintedFrontTexture,
}));

// =============================================================
// HELPERS
// =============================================================

export const getContentByPlatform = (platform) => {
    if (platform === 'all') {
        return CONTENT_DATA;
    }

    return CONTENT_DATA.filter(
        (item) => item.platform === platform
    );
};

// =============================================================
// GET LATEST EDUCATION LEVEL
// =============================================================

export const getLatestContent = () => {
    return [...CONTENT_DATA].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    )[0];
};