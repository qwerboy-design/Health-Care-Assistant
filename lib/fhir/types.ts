/**
 * HL7 FHIR R5 Type Definitions
 * 
 * 依據 FHIR R5 規範定義的 TypeScript 類型
 * @see https://hl7.org/fhir/
 */

// ============================================
// FHIR 基礎資源介面
// ============================================

export interface FHIRResource {
  resourceType: string;
  id?: string;
  meta?: Meta;
}

export interface Meta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
}

// ============================================
// FHIR 資料類型
// ============================================

export interface Identifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: CodeableConcept;
  system?: string;
  value?: string;
  period?: Period;
}

export interface HumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: Period;
}

export interface ContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: Period;
}

export interface Address {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: Period;
}

export interface Period {
  start?: string;
  end?: string;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Coding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface Quantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>' | 'ad';
  unit?: string;
  system?: string;
  code?: string;
}

export interface Reference {
  reference?: string;
  type?: string;
  identifier?: Identifier;
  display?: string;
}

export interface Range {
  low?: Quantity;
  high?: Quantity;
}

export interface Ratio {
  numerator?: Quantity;
  denominator?: Quantity;
}

export interface Annotation {
  authorReference?: Reference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface Attachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
  height?: number;
  width?: number;
  frames?: number;
  duration?: number;
  pages?: number;
}

export interface Duration {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>' | 'ad';
  unit?: string;
  system?: string;
  code?: string;
}

// ============================================
// Patient 資源
// ============================================

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: Identifier[];
  active?: boolean;
  name?: HumanName[];
  telecom?: ContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: Address[];
  maritalStatus?: CodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  contact?: PatientContact[];
  communication?: PatientCommunication[];
}

export interface PatientContact {
  relationship?: CodeableConcept[];
  name?: HumanName;
  telecom?: ContactPoint[];
  address?: Address;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: Reference;
  period?: Period;
}

export interface PatientCommunication {
  language: CodeableConcept;
  preferred?: boolean;
}

// ============================================
// Observation 資源
// ============================================

export type ObservationStatus = 
  | 'registered' 
  | 'preliminary' 
  | 'final' 
  | 'amended' 
  | 'corrected' 
  | 'cancelled' 
  | 'entered-in-error' 
  | 'unknown';

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: Identifier[];
  status: ObservationStatus;
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  issued?: string;
  performer?: Reference[];
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: Range;
  dataAbsentReason?: CodeableConcept;
  interpretation?: CodeableConcept[];
  note?: Annotation[];
  bodySite?: CodeableConcept;
  method?: CodeableConcept;
  specimen?: Reference;
  device?: Reference;
  referenceRange?: ObservationReferenceRange[];
  component?: ObservationComponent[];
}

export interface ObservationComponent {
  code: CodeableConcept;
  valueQuantity?: Quantity;
  valueCodeableConcept?: CodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: Range;
  dataAbsentReason?: CodeableConcept;
  interpretation?: CodeableConcept[];
  referenceRange?: ObservationReferenceRange[];
}

export interface ObservationReferenceRange {
  low?: Quantity;
  high?: Quantity;
  type?: CodeableConcept;
  appliesTo?: CodeableConcept[];
  age?: Range;
  text?: string;
}

// ============================================
// Bundle 資源
// ============================================

export type BundleType = 
  | 'document' 
  | 'message' 
  | 'transaction' 
  | 'transaction-response' 
  | 'batch' 
  | 'batch-response' 
  | 'history' 
  | 'searchset' 
  | 'collection' 
  | 'subscription-notification';

export interface FHIRBundle extends FHIRResource {
  resourceType: 'Bundle';
  identifier?: Identifier;
  type: BundleType;
  timestamp?: string;
  total?: number;
  link?: BundleLink[];
  entry?: BundleEntry[];
  signature?: Signature;
}

export interface BundleLink {
  relation: string;
  url: string;
}

export interface BundleEntry {
  link?: BundleLink[];
  fullUrl?: string;
  resource?: FHIRResource;
  search?: BundleEntrySearch;
  request?: BundleEntryRequest;
  response?: BundleEntryResponse;
}

export interface BundleEntrySearch {
  mode?: 'match' | 'include' | 'outcome';
  score?: number;
}

export interface BundleEntryRequest {
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  ifNoneMatch?: string;
  ifModifiedSince?: string;
  ifMatch?: string;
  ifNoneExist?: string;
}

export interface BundleEntryResponse {
  status: string;
  location?: string;
  etag?: string;
  lastModified?: string;
  outcome?: FHIRResource;
}

export interface Signature {
  type: Coding[];
  when: string;
  who: Reference;
  onBehalfOf?: Reference;
  targetFormat?: string;
  sigFormat?: string;
  data?: string;
}

// ============================================
// Condition 資源
// ============================================

export type ConditionClinicalStatus = 
  | 'active' 
  | 'recurrence' 
  | 'relapse' 
  | 'inactive' 
  | 'remission' 
  | 'resolved';

export type ConditionVerificationStatus = 
  | 'unconfirmed' 
  | 'provisional' 
  | 'differential' 
  | 'confirmed' 
  | 'refuted' 
  | 'entered-in-error';

export interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  identifier?: Identifier[];
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  category?: CodeableConcept[];
  severity?: CodeableConcept;
  code?: CodeableConcept;
  bodySite?: CodeableConcept[];
  subject: Reference;
  encounter?: Reference;
  onsetDateTime?: string;
  onsetAge?: Quantity;
  onsetPeriod?: Period;
  onsetRange?: Range;
  onsetString?: string;
  abatementDateTime?: string;
  abatementAge?: Quantity;
  abatementPeriod?: Period;
  abatementRange?: Range;
  abatementString?: string;
  recordedDate?: string;
  participant?: ConditionParticipant[];
  note?: Annotation[];
}

export interface ConditionParticipant {
  function?: CodeableConcept;
  actor: Reference;
}

// ============================================
// DiagnosticReport 資源
// ============================================

export type DiagnosticReportStatus = 
  | 'registered' 
  | 'partial' 
  | 'preliminary' 
  | 'modified' 
  | 'final' 
  | 'amended' 
  | 'corrected' 
  | 'appended' 
  | 'cancelled' 
  | 'entered-in-error' 
  | 'unknown';

export interface FHIRDiagnosticReport extends FHIRResource {
  resourceType: 'DiagnosticReport';
  identifier?: Identifier[];
  basedOn?: Reference[];
  status: DiagnosticReportStatus;
  category?: CodeableConcept[];
  code: CodeableConcept;
  subject?: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  issued?: string;
  performer?: Reference[];
  resultsInterpreter?: Reference[];
  specimen?: Reference[];
  result?: Reference[];
  note?: Annotation[];
  study?: Reference[];
  supportingInfo?: DiagnosticReportSupportingInfo[];
  media?: DiagnosticReportMedia[];
  composition?: Reference;
  conclusion?: string;
  conclusionCode?: CodeableConcept[];
  presentedForm?: Attachment[];
}

export interface DiagnosticReportSupportingInfo {
  type: CodeableConcept;
  reference: Reference;
}

export interface DiagnosticReportMedia {
  comment?: string;
  link: Reference;
}

// ============================================
// MedicationStatement 資源
// ============================================

export type MedicationStatementStatus = 'recorded' | 'entered-in-error' | 'draft';

export interface FHIRMedicationStatement extends FHIRResource {
  resourceType: 'MedicationStatement';
  identifier?: Identifier[];
  status: MedicationStatementStatus;
  category?: CodeableConcept[];
  medication: CodeableReference;
  subject: Reference;
  encounter?: Reference;
  effectiveDateTime?: string;
  effectivePeriod?: Period;
  effectiveTiming?: Timing;
  dateAsserted?: string;
  informationSource?: Reference[];
  derivedFrom?: Reference[];
  reason?: CodeableReference[];
  note?: Annotation[];
  relatedClinicalInformation?: Reference[];
  renderedDosageInstruction?: string;
  dosage?: Dosage[];
  adherence?: MedicationStatementAdherence;
}

export interface CodeableReference {
  concept?: CodeableConcept;
  reference?: Reference;
}

export interface Timing {
  event?: string[];
  repeat?: TimingRepeat;
  code?: CodeableConcept;
}

export interface TimingRepeat {
  boundsDuration?: Duration;
  boundsRange?: Range;
  boundsPeriod?: Period;
  count?: number;
  countMax?: number;
  duration?: number;
  durationMax?: number;
  durationUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  frequency?: number;
  frequencyMax?: number;
  period?: number;
  periodMax?: number;
  periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  dayOfWeek?: string[];
  timeOfDay?: string[];
  when?: string[];
  offset?: number;
}

export interface Dosage {
  sequence?: number;
  text?: string;
  additionalInstruction?: CodeableConcept[];
  patientInstruction?: string;
  timing?: Timing;
  asNeeded?: boolean;
  asNeededFor?: CodeableConcept[];
  site?: CodeableConcept;
  route?: CodeableConcept;
  method?: CodeableConcept;
  doseAndRate?: DosageDoseAndRate[];
  maxDosePerPeriod?: Ratio[];
  maxDosePerAdministration?: Quantity;
  maxDosePerLifetime?: Quantity;
}

export interface DosageDoseAndRate {
  type?: CodeableConcept;
  doseRange?: Range;
  doseQuantity?: Quantity;
  rateRatio?: Ratio;
  rateRange?: Range;
  rateQuantity?: Quantity;
}

export interface MedicationStatementAdherence {
  code: CodeableConcept;
  reason?: CodeableConcept;
}

// ============================================
// 解析結果類型
// ============================================

export interface FHIRParseResult {
  success: boolean;
  data?: FHIRResource;
  error?: string;
}

export interface FHIRValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning' | 'information';
}

export interface FHIRSummary {
  resourceType: string;
  resourceTypeDisplay: string;
  title: string;
  details: SummaryDetail[];
  statistics?: ResourceStatistics;
  rawJson: string;
}

export interface SummaryDetail {
  label: string;
  value: string;
  type?: 'text' | 'date' | 'number' | 'code';
}

export interface ResourceStatistics {
  total: number;
  byType: Record<string, number>;
}

// ============================================
// 支援的資源類型
// ============================================

export const SUPPORTED_RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Bundle',
  'Condition',
  'DiagnosticReport',
  'MedicationStatement',
] as const;

export type SupportedResourceType = typeof SUPPORTED_RESOURCE_TYPES[number];

// ============================================
// 資源類型顯示名稱
// ============================================

export const RESOURCE_TYPE_DISPLAY: Record<string, { zhTW: string; en: string }> = {
  Patient: { zhTW: '病人', en: 'Patient' },
  Observation: { zhTW: '觀察/檢驗', en: 'Observation' },
  Bundle: { zhTW: '資源集合', en: 'Bundle' },
  Condition: { zhTW: '疾病診斷', en: 'Condition' },
  DiagnosticReport: { zhTW: '診斷報告', en: 'Diagnostic Report' },
  MedicationStatement: { zhTW: '用藥記錄', en: 'Medication Statement' },
};

// ============================================
// 類型守衛函數
// ============================================

export function isPatient(resource: FHIRResource): resource is FHIRPatient {
  return resource.resourceType === 'Patient';
}

export function isObservation(resource: FHIRResource): resource is FHIRObservation {
  return resource.resourceType === 'Observation';
}

export function isBundle(resource: FHIRResource): resource is FHIRBundle {
  return resource.resourceType === 'Bundle';
}

export function isCondition(resource: FHIRResource): resource is FHIRCondition {
  return resource.resourceType === 'Condition';
}

export function isDiagnosticReport(resource: FHIRResource): resource is FHIRDiagnosticReport {
  return resource.resourceType === 'DiagnosticReport';
}

export function isMedicationStatement(resource: FHIRResource): resource is FHIRMedicationStatement {
  return resource.resourceType === 'MedicationStatement';
}

export function isSupportedResourceType(type: string): type is SupportedResourceType {
  return SUPPORTED_RESOURCE_TYPES.includes(type as SupportedResourceType);
}

// ============================================
// 有效狀態值
// ============================================

export const VALID_OBSERVATION_STATUS: ObservationStatus[] = [
  'registered',
  'preliminary',
  'final',
  'amended',
  'corrected',
  'cancelled',
  'entered-in-error',
  'unknown',
];

export const VALID_BUNDLE_TYPES: BundleType[] = [
  'document',
  'message',
  'transaction',
  'transaction-response',
  'batch',
  'batch-response',
  'history',
  'searchset',
  'collection',
  'subscription-notification',
];

export const VALID_DIAGNOSTIC_REPORT_STATUS: DiagnosticReportStatus[] = [
  'registered',
  'partial',
  'preliminary',
  'modified',
  'final',
  'amended',
  'corrected',
  'appended',
  'cancelled',
  'entered-in-error',
  'unknown',
];
