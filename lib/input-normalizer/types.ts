export type SourceFormat = 'md' | 'txt' | 'pdf' | 'docx';

export interface NormalizedInput {
  featureName: string;
  objetivo: string | null;
  contexto: string[];
  acs: AcCandidate[];
  gaps: string[];
  anexos: string[];
}

export interface AcCandidate {
  id: string;
  raw: string;
  inferred: boolean;
}
