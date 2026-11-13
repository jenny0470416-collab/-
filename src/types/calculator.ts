export type CalculatorMode = 'standard' | 'scientific';
export type AngleUnit = 'DEG' | 'RAD';
export type SidePanelTab = 'history' | 'converter';

export interface HistoryEntry {
  id: string;
  expression: string;
  formattedExpression: string;
  result: string;
  numericResult: number;
  mode: CalculatorMode;
  angleUnit: AngleUnit;
  timestamp: number;
}

export type ConverterCategoryId = 'area' | 'length' | 'weight' | 'temperature' | 'data';

export interface UnitDefinition {
  id: string;
  label: string;
  symbol: string;
  /** Factor relative to base unit (not used for temperature) */
  factor?: number;
}

export interface ConverterCategory {
  id: ConverterCategoryId;
  label: string;
  units: UnitDefinition[];
}
