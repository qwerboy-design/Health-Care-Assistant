/**
 * FHIR Parser Module
 * 
 * 提供 FHIR 資源的解析、驗證和格式化功能
 */

import {
  FHIRResource,
  FHIRPatient,
  FHIRObservation,
  FHIRBundle,
  FHIRCondition,
  FHIRDiagnosticReport,
  FHIRMedicationStatement,
  FHIRParseResult,
  FHIRValidationResult,
  FHIRSummary,
  SummaryDetail,
  ValidationError,
  ResourceStatistics,
  HumanName,
  CodeableConcept,
  Quantity,
  ObservationComponent,
  isPatient,
  isObservation,
  isBundle,
  isCondition,
  isDiagnosticReport,
  isMedicationStatement,
  isSupportedResourceType,
  RESOURCE_TYPE_DISPLAY,
  VALID_OBSERVATION_STATUS,
  VALID_BUNDLE_TYPES,
  VALID_DIAGNOSTIC_REPORT_STATUS,
} from './types';
import { redactFhirResource } from '@/lib/privacy/redaction';

// ============================================
// 解析函數
// ============================================

/**
 * 解析 FHIR JSON 字串
 */
export function parseFHIR(content: string): FHIRParseResult {
  try {
    const data = JSON.parse(content);
    
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'PARSE_ERROR',
      };
    }

    if (!('resourceType' in data) || typeof data.resourceType !== 'string') {
      return {
        success: false,
        error: 'MISSING_RESOURCE_TYPE',
      };
    }

    return {
      success: true,
      data: data as FHIRResource,
    };
  } catch (e) {
    return {
      success: false,
      error: 'PARSE_ERROR',
    };
  }
}

/**
 * 解析 FHIR XML 字串（基本實作）
 */
export function parseFHIRXML(content: string): FHIRParseResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return {
        success: false,
        error: 'PARSE_ERROR',
      };
    }

    const rootElement = doc.documentElement;
    const resourceType = rootElement.tagName;

    if (!resourceType) {
      return {
        success: false,
        error: 'MISSING_RESOURCE_TYPE',
      };
    }

    const jsonData = xmlToJson(rootElement);
    jsonData.resourceType = resourceType;

    return {
      success: true,
      data: jsonData as unknown as FHIRResource,
    };
  } catch (e) {
    return {
      success: false,
      error: 'PARSE_ERROR',
    };
  }
}

/**
 * 將 XML 元素轉換為 JSON 物件（簡化版）
 */
function xmlToJson(element: Element): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (element.hasAttribute('value')) {
    return { value: element.getAttribute('value') } as Record<string, unknown>;
  }

  for (const child of Array.from(element.children)) {
    const key = child.tagName;
    const value = xmlToJson(child);

    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================
// 驗證函數
// ============================================

/**
 * 驗證 FHIR 資源
 */
export function validateFHIR(data: unknown): FHIRValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({
      path: '',
      message: 'Invalid data: expected an object',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  const resource = data as Record<string, unknown>;

  if (!('resourceType' in resource) || typeof resource.resourceType !== 'string') {
    errors.push({
      path: 'resourceType',
      message: 'Missing or invalid resourceType',
      severity: 'error',
    });
    return { valid: false, errors, warnings };
  }

  const resourceType = resource.resourceType as string;

  if (!isSupportedResourceType(resourceType)) {
    warnings.push({
      path: 'resourceType',
      message: `Resource type "${resourceType}" is not fully supported`,
      severity: 'warning',
    });
  }

  switch (resourceType) {
    case 'Observation':
      validateObservation(resource as unknown as FHIRObservation, errors, warnings);
      break;
    case 'Bundle':
      validateBundle(resource as unknown as FHIRBundle, errors, warnings);
      break;
    case 'DiagnosticReport':
      validateDiagnosticReport(resource as unknown as FHIRDiagnosticReport, errors, warnings);
      break;
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function validateObservation(
  obs: FHIRObservation,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!obs.status) {
    errors.push({
      path: 'status',
      message: 'Observation.status is required',
      severity: 'error',
    });
  } else if (!VALID_OBSERVATION_STATUS.includes(obs.status)) {
    errors.push({
      path: 'status',
      message: `Invalid Observation.status: "${obs.status}"`,
      severity: 'error',
    });
  }

  if (!obs.code) {
    errors.push({
      path: 'code',
      message: 'Observation.code is required',
      severity: 'error',
    });
  }
}

function validateBundle(
  bundle: FHIRBundle,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!bundle.type) {
    errors.push({
      path: 'type',
      message: 'Bundle.type is required',
      severity: 'error',
    });
  } else if (!VALID_BUNDLE_TYPES.includes(bundle.type)) {
    errors.push({
      path: 'type',
      message: `Invalid Bundle.type: "${bundle.type}"`,
      severity: 'error',
    });
  }

  if (bundle.entry) {
    bundle.entry.forEach((entry, index) => {
      if (entry.resource) {
        const entryValidation = validateFHIR(entry.resource);
        if (!entryValidation.valid && entryValidation.errors) {
          entryValidation.errors.forEach((err) => {
            errors.push({
              ...err,
              path: `entry[${index}].resource.${err.path}`,
            });
          });
        }
      }
    });
  }
}

function validateDiagnosticReport(
  report: FHIRDiagnosticReport,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  if (!report.status) {
    errors.push({
      path: 'status',
      message: 'DiagnosticReport.status is required',
      severity: 'error',
    });
  } else if (!VALID_DIAGNOSTIC_REPORT_STATUS.includes(report.status)) {
    errors.push({
      path: 'status',
      message: `Invalid DiagnosticReport.status: "${report.status}"`,
      severity: 'error',
    });
  }

  if (!report.code) {
    errors.push({
      path: 'code',
      message: 'DiagnosticReport.code is required',
      severity: 'error',
    });
  }
}

// ============================================
// 格式化函數
// ============================================

/**
 * 格式化 FHIR 資源為摘要
 */
export function formatFHIRSummary(
  resource: FHIRResource,
  locale: 'zh-TW' | 'en' = 'zh-TW'
): FHIRSummary {
  const localeKey = locale === 'zh-TW' ? 'zhTW' : 'en';
  const resourceTypeDisplay = RESOURCE_TYPE_DISPLAY[resource.resourceType]?.[localeKey] 
    || resource.resourceType;

  if (isPatient(resource)) {
    return formatPatientSummary(resource, resourceTypeDisplay, locale);
  }

  if (isObservation(resource)) {
    return formatObservationSummary(resource, resourceTypeDisplay, locale);
  }

  if (isBundle(resource)) {
    return formatBundleSummary(resource, resourceTypeDisplay, locale);
  }

  if (isCondition(resource)) {
    return formatConditionSummary(resource, resourceTypeDisplay, locale);
  }

  if (isDiagnosticReport(resource)) {
    return formatDiagnosticReportSummary(resource, resourceTypeDisplay, locale);
  }

  if (isMedicationStatement(resource)) {
    return formatMedicationStatementSummary(resource, resourceTypeDisplay, locale);
  }

  return formatGenericSummary(resource, resourceTypeDisplay, locale);
}

function formatPatientSummary(
  patient: FHIRPatient,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);

  if (patient.identifier?.length) {
    const primaryId = patient.identifier[0];
    details.push({
      label: labels.identifier,
      value: primaryId.value || '-',
      type: 'text',
    });
  }

  if (patient.name?.length) {
    details.push({
      label: labels.name,
      value: formatHumanName(patient.name[0]),
      type: 'text',
    });
  }

  if (patient.gender) {
    details.push({
      label: labels.gender,
      value: formatGender(patient.gender, locale),
      type: 'code',
    });
  }

  if (patient.birthDate) {
    details.push({
      label: labels.birthDate,
      value: patient.birthDate,
      type: 'date',
    });
  }

  if (patient.telecom?.length) {
    const phone = patient.telecom.find((t) => t.system === 'phone');
    if (phone?.value) {
      details.push({
        label: labels.phone,
        value: phone.value,
        type: 'text',
      });
    }
  }

  if (patient.address?.length) {
    const addr = patient.address[0];
    const addressParts = [addr.city, addr.district].filter(Boolean);
    if (addressParts.length > 0) {
      details.push({
        label: labels.address,
        value: addressParts.join(' '),
        type: 'text',
      });
    }
  }

  const title = patient.name?.length 
    ? formatHumanName(patient.name[0]) 
    : patient.id || labels.unknownPatient;

  return {
    resourceType: 'Patient',
    resourceTypeDisplay,
    title,
    details,
    rawJson: JSON.stringify(patient, null, 2),
  };
}

function formatObservationSummary(
  obs: FHIRObservation,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);

  details.push({
    label: labels.status,
    value: obs.status,
    type: 'code',
  });

  if (obs.code) {
    details.push({
      label: labels.code,
      value: formatCodeableConcept(obs.code),
      type: 'text',
    });
  }

  if (obs.category?.length) {
    details.push({
      label: labels.category,
      value: obs.category.map(formatCodeableConcept).join(', '),
      type: 'text',
    });
  }

  if (obs.effectiveDateTime) {
    details.push({
      label: labels.effectiveDate,
      value: formatDateTime(obs.effectiveDateTime),
      type: 'date',
    });
  }

  if (obs.valueQuantity) {
    details.push({
      label: labels.value,
      value: formatQuantity(obs.valueQuantity),
      type: 'number',
    });
  } else if (obs.valueString) {
    details.push({
      label: labels.value,
      value: obs.valueString,
      type: 'text',
    });
  } else if (obs.valueCodeableConcept) {
    details.push({
      label: labels.value,
      value: formatCodeableConcept(obs.valueCodeableConcept),
      type: 'text',
    });
  }

  if (obs.component?.length) {
    obs.component.forEach((comp, index) => {
      const compLabel = formatCodeableConcept(comp.code);
      if (comp.valueQuantity) {
        details.push({
          label: compLabel,
          value: formatQuantity(comp.valueQuantity),
          type: 'number',
        });
      }
    });
  }

  const title = formatCodeableConcept(obs.code);

  return {
    resourceType: 'Observation',
    resourceTypeDisplay,
    title,
    details,
    rawJson: JSON.stringify(obs, null, 2),
  };
}

function formatBundleSummary(
  bundle: FHIRBundle,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);
  const localeKey = locale === 'zh-TW' ? 'zhTW' : 'en';

  details.push({
    label: labels.bundleType,
    value: bundle.type,
    type: 'code',
  });

  if (bundle.timestamp) {
    details.push({
      label: labels.timestamp,
      value: formatDateTime(bundle.timestamp),
      type: 'date',
    });
  }

  const entryCount = bundle.entry?.length || 0;
  details.push({
    label: labels.entryCount,
    value: String(entryCount),
    type: 'number',
  });

  const statistics = calculateBundleStatistics(bundle);
  
  Object.entries(statistics.byType).forEach(([type, count]) => {
    const typeDisplay = RESOURCE_TYPE_DISPLAY[type]?.[localeKey] || type;
    details.push({
      label: typeDisplay,
      value: String(count),
      type: 'number',
    });
  });

  const title = locale === 'zh-TW' 
    ? `${resourceTypeDisplay} (${entryCount} 筆資源)`
    : `${resourceTypeDisplay} (${entryCount} resources)`;

  return {
    resourceType: 'Bundle',
    resourceTypeDisplay,
    title,
    details,
    statistics,
    rawJson: JSON.stringify(bundle, null, 2),
  };
}

function formatConditionSummary(
  condition: FHIRCondition,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);

  if (condition.clinicalStatus) {
    details.push({
      label: labels.clinicalStatus,
      value: formatCodeableConcept(condition.clinicalStatus),
      type: 'code',
    });
  }

  if (condition.code) {
    details.push({
      label: labels.diagnosis,
      value: formatCodeableConcept(condition.code),
      type: 'text',
    });
  }

  if (condition.onsetDateTime) {
    details.push({
      label: labels.onsetDate,
      value: formatDateTime(condition.onsetDateTime),
      type: 'date',
    });
  }

  if (condition.severity) {
    details.push({
      label: labels.severity,
      value: formatCodeableConcept(condition.severity),
      type: 'code',
    });
  }

  const title = condition.code 
    ? formatCodeableConcept(condition.code) 
    : condition.id || 'Condition';

  return {
    resourceType: 'Condition',
    resourceTypeDisplay,
    title,
    details,
    rawJson: JSON.stringify(condition, null, 2),
  };
}

function formatDiagnosticReportSummary(
  report: FHIRDiagnosticReport,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);

  details.push({
    label: labels.status,
    value: report.status,
    type: 'code',
  });

  if (report.code) {
    details.push({
      label: labels.reportType,
      value: formatCodeableConcept(report.code),
      type: 'text',
    });
  }

  if (report.effectiveDateTime) {
    details.push({
      label: labels.effectiveDate,
      value: formatDateTime(report.effectiveDateTime),
      type: 'date',
    });
  }

  if (report.conclusion) {
    details.push({
      label: labels.conclusion,
      value: report.conclusion,
      type: 'text',
    });
  }

  if (report.result?.length) {
    details.push({
      label: labels.resultCount,
      value: String(report.result.length),
      type: 'number',
    });
  }

  const title = report.code 
    ? formatCodeableConcept(report.code) 
    : report.id || 'DiagnosticReport';

  return {
    resourceType: 'DiagnosticReport',
    resourceTypeDisplay,
    title,
    details,
    rawJson: JSON.stringify(report, null, 2),
  };
}

function formatMedicationStatementSummary(
  medStatement: FHIRMedicationStatement,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);

  details.push({
    label: labels.status,
    value: medStatement.status,
    type: 'code',
  });

  if (medStatement.medication?.concept) {
    details.push({
      label: labels.medication,
      value: formatCodeableConcept(medStatement.medication.concept),
      type: 'text',
    });
  }

  if (medStatement.effectiveDateTime) {
    details.push({
      label: labels.effectiveDate,
      value: formatDateTime(medStatement.effectiveDateTime),
      type: 'date',
    });
  }

  if (medStatement.dosage?.length) {
    const dosage = medStatement.dosage[0];
    if (dosage.text) {
      details.push({
        label: labels.dosage,
        value: dosage.text,
        type: 'text',
      });
    }
  }

  const title = medStatement.medication?.concept 
    ? formatCodeableConcept(medStatement.medication.concept) 
    : medStatement.id || 'MedicationStatement';

  return {
    resourceType: 'MedicationStatement',
    resourceTypeDisplay,
    title,
    details,
    rawJson: JSON.stringify(medStatement, null, 2),
  };
}

function formatGenericSummary(
  resource: FHIRResource,
  resourceTypeDisplay: string,
  locale: 'zh-TW' | 'en'
): FHIRSummary {
  const details: SummaryDetail[] = [];
  const labels = getLabels(locale);

  if (resource.id) {
    details.push({
      label: labels.id,
      value: resource.id,
      type: 'text',
    });
  }

  details.push({
    label: labels.resourceType,
    value: resource.resourceType,
    type: 'code',
  });

  return {
    resourceType: resource.resourceType,
    resourceTypeDisplay,
    title: resource.id || resource.resourceType,
    details,
    rawJson: JSON.stringify(resource, null, 2),
  };
}

// ============================================
// 輔助函數
// ============================================

function formatHumanName(name: HumanName): string {
  if (name.text) return name.text;
  
  const parts: string[] = [];
  if (name.family) parts.push(name.family);
  if (name.given?.length) parts.push(name.given.join(''));
  
  return parts.join('') || '-';
}

function formatCodeableConcept(cc: CodeableConcept): string {
  if (cc.text) return cc.text;
  if (cc.coding?.length) {
    const coding = cc.coding[0];
    return coding.display || coding.code || '-';
  }
  return '-';
}

function formatQuantity(q: Quantity): string {
  if (q.value === undefined) return '-';
  const unit = q.unit || q.code || '';
  return `${q.value}${unit ? ' ' + unit : ''}`;
}

function formatDateTime(dt: string): string {
  try {
    const date = new Date(dt);
    if (isNaN(date.getTime())) return dt;
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function formatGender(gender: string, locale: 'zh-TW' | 'en'): string {
  const genderMap: Record<string, { zhTW: string; en: string }> = {
    male: { zhTW: '男', en: 'Male' },
    female: { zhTW: '女', en: 'Female' },
    other: { zhTW: '其他', en: 'Other' },
    unknown: { zhTW: '未知', en: 'Unknown' },
  };
  return genderMap[gender]?.[locale === 'zh-TW' ? 'zhTW' : 'en'] || gender;
}

function calculateBundleStatistics(bundle: FHIRBundle): ResourceStatistics {
  const byType: Record<string, number> = {};
  let total = 0;

  if (bundle.entry) {
    bundle.entry.forEach((entry) => {
      if (entry.resource) {
        const type = entry.resource.resourceType;
        byType[type] = (byType[type] || 0) + 1;
        total++;
      }
    });
  }

  return { total, byType };
}

function getLabels(locale: 'zh-TW' | 'en') {
  return locale === 'zh-TW' ? labelsZhTW : labelsEn;
}

const labelsZhTW = {
  identifier: '識別碼',
  name: '姓名',
  gender: '性別',
  birthDate: '出生日期',
  phone: '電話',
  address: '地址',
  status: '狀態',
  code: '代碼',
  category: '類別',
  effectiveDate: '生效日期',
  value: '數值',
  bundleType: 'Bundle 類型',
  timestamp: '時間戳記',
  entryCount: '資源數量',
  clinicalStatus: '臨床狀態',
  diagnosis: '診斷',
  onsetDate: '發病日期',
  severity: '嚴重程度',
  reportType: '報告類型',
  conclusion: '結論',
  resultCount: '結果數量',
  medication: '藥物',
  dosage: '劑量',
  id: 'ID',
  resourceType: '資源類型',
  unknownPatient: '未知病人',
};

const labelsEn = {
  identifier: 'Identifier',
  name: 'Name',
  gender: 'Gender',
  birthDate: 'Birth Date',
  phone: 'Phone',
  address: 'Address',
  status: 'Status',
  code: 'Code',
  category: 'Category',
  effectiveDate: 'Effective Date',
  value: 'Value',
  bundleType: 'Bundle Type',
  timestamp: 'Timestamp',
  entryCount: 'Entry Count',
  clinicalStatus: 'Clinical Status',
  diagnosis: 'Diagnosis',
  onsetDate: 'Onset Date',
  severity: 'Severity',
  reportType: 'Report Type',
  conclusion: 'Conclusion',
  resultCount: 'Result Count',
  medication: 'Medication',
  dosage: 'Dosage',
  id: 'ID',
  resourceType: 'Resource Type',
  unknownPatient: 'Unknown Patient',
};

// ============================================
// 匯出便捷函數
// ============================================

/**
 * 解析並驗證 FHIR 資源
 */
export function parseAndValidateFHIR(content: string): {
  parseResult: FHIRParseResult;
  validationResult?: FHIRValidationResult;
} {
  const parseResult = parseFHIR(content);
  
  if (!parseResult.success || !parseResult.data) {
    return { parseResult };
  }

  const validationResult = validateFHIR(parseResult.data);
  return { parseResult, validationResult };
}

/**
 * 完整處理 FHIR 內容：解析、驗證、格式化
 */
export function processFHIRContent(
  content: string,
  locale: 'zh-TW' | 'en' = 'zh-TW'
): {
  success: boolean;
  error?: string;
  summary?: FHIRSummary;
  resource?: FHIRResource;
  validationResult?: FHIRValidationResult;
} {
  const { parseResult, validationResult } = parseAndValidateFHIR(content);

  if (!parseResult.success || !parseResult.data) {
    return {
      success: false,
      error: parseResult.error,
    };
  }

  if (validationResult && !validationResult.valid) {
    return {
      success: false,
      error: validationResult.errors?.[0]?.message || 'Validation failed',
      validationResult,
    };
  }

  const redactedResource = redactFhirResource(parseResult.data);
  const summary = formatFHIRSummary(redactedResource, locale);

  return {
    success: true,
    summary,
    resource: parseResult.data,
    validationResult,
  };
}
