/**
 * Decoded Assessment — Scoring Type Definitions
 * 
 * All scoring functions conform to InstrumentScore output.
 * Pure functions: no side effects, no DB access.
 */

export interface InstrumentScore {
  instrumentId: string;
  totalScore?: number;
  subscaleScores?: Record<string, number>;
  percentileScores?: Record<string, number>;
  interpretation?: Record<string, string | boolean | number>;
  rawScoreDetails?: Record<string, number>;
}

// Big Five output shape
export interface IPIP50Score extends InstrumentScore {
  instrumentId: 'ipip50';
  subscaleScores: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  percentileScores: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  rawScoreDetails: Record<string, number>;
}

// RIASEC output shape
export interface RIASECScore extends InstrumentScore {
  instrumentId: 'riasec';
  subscaleScores: {
    realistic: number;
    investigative: number;
    artistic: number;
    social: number;
    enterprising: number;
    conventional: number;
  };
  interpretation: {
    hollandCode: string;
  };
}

// ECR-R Short output shape
export interface ECRRShortScore extends InstrumentScore {
  instrumentId: 'ecr_r_short';
  subscaleScores: {
    anxiety: number;
    avoidance: number;
  };
  interpretation: {
    attachmentStyle: string; // 'secure' | 'anxious' | 'avoidant' | 'disorganized'
  };
}

// SWLS output shape
export interface SWLSScore extends InstrumentScore {
  instrumentId: 'swls';
  totalScore: number;
  interpretation: {
    level: string;
  };
}

// SCS-SF output shape
export interface SCSSFScore extends InstrumentScore {
  instrumentId: 'scs_sf';
  totalScore: number;
  subscaleScores: {
    selfKindness: number;
    selfJudgment: number;
    commonHumanity: number;
    isolation: number;
    mindfulness: number;
    overIdentification: number;
  };
}

// DERS-16 output shape
export interface DERS16Score extends InstrumentScore {
  instrumentId: 'ders16';
  totalScore: number;
  subscaleScores: {
    clarity: number;
    goals: number;
    impulse: number;
    nonAcceptance: number;
    strategies: number;
    awareness: number;
  };
}

// WEIMS output shape
export interface WEIMSScore extends InstrumentScore {
  instrumentId: 'weims';
  subscaleScores: {
    intrinsic: number;
    integrated: number;
    identified: number;
    introjected: number;
    external: number;
    amotivation: number;
  };
  interpretation: {
    sdi: number; // Self-Determination Index
  };
}

// Flourishing Scale output shape
export interface FlourishingScore extends InstrumentScore {
  instrumentId: 'flourishing';
  totalScore: number;
  interpretation: {
    level: string;
  };
}

// Decoded Wellness Check output shape
export interface WellnessCheckScore extends InstrumentScore {
  instrumentId: 'wellness_check';
  subscaleScores: {
    exercise: number;
    sleep: number;
    nutrition: number;
    energy: number;
    stress: number;
    coping: number;
    social: number;
    purpose: number;
    screenTime: number;
    vitality: number;
  };
  interpretation: {
    overallWellness: number;
  };
}

// GAD-7 output shape
export interface GAD7Score extends InstrumentScore {
  instrumentId: 'gad7';
  totalScore: number;
  interpretation: {
    severity: string;
  };
}

// ASRS output shape
export interface ASRSScore extends InstrumentScore {
  instrumentId: 'asrs';
  interpretation: {
    positiveCount: number;
    screenPositive: boolean;
  };
}

// CSI-4 output shape
export interface CSI4Score extends InstrumentScore {
  instrumentId: 'csi4';
  totalScore: number;
  interpretation: {
    distressed: boolean;
  };
}

// ACE-3 output shape
export interface ACE3Score extends InstrumentScore {
  instrumentId: 'ace3';
  totalScore: number;
}

// Coaching flags derived from scoring
export interface CoachingFlags {
  highNeuroticism: boolean;    // N ≥ 38
  lowConscientiousness: boolean; // C ≤ 20
  insecureAttachment: boolean;  // Anxiety ≥ 4.0 OR Avoidance ≥ 4.0
  sedentary: boolean;           // exercise = 0
  sleepDeficit: boolean;        // sleep < 6
  highStress: boolean;          // stress ≥ 4
  socialIsolation: boolean;     // social = 0
  lowOverallWellness: boolean;  // overall < 40
}

// Validity check result
export interface ValidityCheckResult {
  isValid: boolean;
  issues: ValidityIssue[];
}

export interface ValidityIssue {
  type: 'straight_lining' | 'contradictory_reverse';
  instrumentId: string;
  description: string;
  severity: 'warning' | 'critical';
}
