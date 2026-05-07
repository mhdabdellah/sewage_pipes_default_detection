export interface PredictionResult {
  class_name: string;
  class_id: number;
  confidence: number;
  probabilities: number[];
  timestamp: string;
  imagePreview: string;
}
