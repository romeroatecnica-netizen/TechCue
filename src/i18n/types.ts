import type {LocaleCode} from '../config/seo';

export type ModuleId = 'gears' | 'pulleys' | 'circuits' | 'blitz' | 'duel';

export interface FaqEntry {
  q: string;
  a: string;
}

export interface GuideSection {
  title: string;
  formula: string;
  summary: string;
  bullets: string[];
}

export interface KitItem {
  category: string;
  title: string;
  description: string;
  priceHint: string;
  url: string;
}

export interface TranslationDict {
  langName: string;
  seo: {
    title: string;
    description: string;
    appName: string;
  };
  nav: {
    trainer: string;
    guide: string;
    kits: string;
    faq: string;
    profileBtn: string;
    soundOn: string;
    soundOff: string;
  };
  hero: {
    title: string;
    subtitle: string;
    statXp: string;
    statStreak: string;
    statSolved: string;
    statRank: string;
    daysUnit: string;
  };
  tabs: {
    gears: string;
    pulleys: string;
    circuits: string;
    blitz: string;
    duel: string;
  };
  duel: {
    heroBtn: string;
    title: string;
    subtitle: string;
    seedLabel: string;
    newSeedBtn: string;
    playAndChallenge: string;
    copyOpenLink: string;
    copyScoreLink: string;
    copied: string;
    shareNative: string;
    incomingBanner: string;
    beatScorePrompt: string;
    pointsUnit: string;
    secondsUnit: string;
    roundLabel: string;
    yourResult: string;
    challengerResult: string;
    winResult: string;
    tieResult: string;
    loseResult: string;
    rematchBtn: string;
    exitDuel: string;
    accuracyLabel: string;
  };
  ranks: [string, string, string, string, string];
  common: {
    testMechanism: string;
    stopMechanism: string;
    nextChallenge: string;
    checkAnswer: string;
    reset: string;
    correct: string;
    tryAgain: string;
    explanation: string;
    level: string;
    xpEarned: string;
    cw: string;
    ccw: string;
    faster: string;
    sameSpeed: string;
    slower: string;
    hint: string;
    close: string;
    target: string;
    current: string;
    active: string;
    off: string;
  };
  gears: {
    modeChallenge: string;
    modeBuilder: string;
    driverMotor: string;
    outputGear: string;
    teethLabel: string;
    rpmLabel: string;
    ratioLabel: string;
    directionLabel: string;
    questionDir: string;
    questionSpeed: string;
    builderGoalPrefix: string;
    gearCountLabel: string;
    addGear: string;
    removeGear: string;
    gearTeethControl: string;
    motorDirControl: string;
    goalMet: string;
    goalNotMet: string;
    gearLabel: string;
  };
  pulleys: {
    modeLab: string;
    modeChallenge: string;
    rigType: string;
    rigFixed: string;
    rigMovable: string;
    rigBlock2: string;
    rigCompound4: string;
    loadWeight: string;
    effortForce: string;
    mechAdv: string;
    ropePull: string;
    loadLift: string;
    pullRopeBtn: string;
    lowerLoadBtn: string;
    supportingRopes: string;
    directionChange: string;
    sameDirection: string;
    challengePrompt: string;
    pickBestRig: string;
  };
  circuits: {
    modePuzzle: string;
    modeSandbox: string;
    boardSeries: string;
    boardParallel: string;
    boardMixed: string;
    boardShortGuard: string;
    batteryLabel: string;
    switchLabel: string;
    openState: string;
    closedState: string;
    bulbOn: string;
    bulbOff: string;
    motorRunning: string;
    motorStopped: string;
    circuitClosed: string;
    circuitOpen: string;
    shortCircuitAlert: string;
    shortCircuitDetail: string;
    toggleSwitchHint: string;
    goalLabel: string;
    goalSolved: string;
    resetSwitches: string;
  };
  blitz: {
    title: string;
    subtitle: string;
    timedMode: string;
    relaxedMode: string;
    startBlitz: string;
    stopBlitz: string;
    scoreLabel: string;
    streakLabel: string;
    multiplierLabel: string;
    timeLabel: string;
    bestStreakLabel: string;
    roundComplete: string;
    playAgain: string;
    leverBalanceLabel: string;
    fulcrumLabel: string;
    tiltsLeft: string;
    balanced: string;
    tiltsRight: string;
  };
  profile: {
    modalTitle: string;
    activeProfile: string;
    createProfile: string;
    newProfilePlaceholder: string;
    createBtn: string;
    renameBtn: string;
    deleteBtn: string;
    masteryTitle: string;
    exportJson: string;
    importJson: string;
    importSuccess: string;
    importError: string;
    challengesCount: string;
  };
  ads: {
    label: string;
    midNote: string;
    bottomNote: string;
  };
  kits: {
    heading: string;
    subheading: string;
    disclosure: string;
    viewKit: string;
    items: [KitItem, KitItem, KitItem, KitItem];
  };
  editorial: {
    heading: string;
    intro: string;
    guides: [GuideSection, GuideSection, GuideSection, GuideSection];
    faqHeading: string;
    faqs: [FaqEntry, FaqEntry, FaqEntry, FaqEntry, FaqEntry];
    disclaimer: string;
  };
  footer: {
    copyright: string;
    canonicalNote: string;
    privacyNote: string;
  };
}

export type TranslationsMap = Record<LocaleCode, TranslationDict>;
