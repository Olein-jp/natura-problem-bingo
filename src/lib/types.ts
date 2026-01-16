export type GradeDef = {
  label: string;
  bgColor: string;
  fontColor: string;
};

export type GradeCode = string;

export type Problem = {
  key: string;
  grade: GradeCode;
  kid: boolean;
  tags?: string[];
};

export type DataSet = {
  grades: Record<GradeCode, GradeDef>;
  problems: Problem[];
};

export type Mode = "kid" | "adult";

export type BingoCell =
  | { kind: "free" }
  | { kind: "problem"; key: string; grade: GradeCode };

export type BingoGrid = BingoCell[][];
