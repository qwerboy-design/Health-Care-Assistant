/**
 * FHIR → LLM Text Formatter
 *
 * 將 FHIR R5 資源轉換為結構化 Markdown 臨床敘事文字，
 * 針對 Anthropic Claude API 的上下文理解進行最佳化。
 */

import {
  FHIRResource,
  FHIRPatient,
  FHIRObservation,
  FHIRBundle,
  FHIRCondition,
  FHIRDiagnosticReport,
  FHIRMedicationStatement,
  CodeableConcept,
  Coding,
  Quantity,
  HumanName,
  ContactPoint,
  Address,
  Identifier,
  Reference,
  Annotation,
  ObservationComponent,
  ObservationReferenceRange,
  Dosage,
  isPatient,
  isObservation,
  isBundle,
  isCondition,
  isDiagnosticReport,
  isMedicationStatement,
} from './types';

export type FhirFormatterLocale = 'zh-TW' | 'en';

type Locale = FhirFormatterLocale;

// ============================================
// 主入口
// ============================================

export function formatFHIRForLLM(resource: FHIRResource, locale: Locale = 'zh-TW'): string {
  const L = getLabels(locale);
  const lines: string[] = [];

  if (isBundle(resource)) {
    lines.push(formatBundleForLLM(resource, locale));
  } else if (isPatient(resource)) {
    lines.push(`[${L.headerTag}]`);
    lines.push('');
    lines.push(formatPatientForLLM(resource, locale));
    lines.push('');
    lines.push('---');
    lines.push(L.footer);
  } else if (isObservation(resource)) {
    lines.push(`[${L.headerTag}]`);
    lines.push('');
    lines.push(formatObservationSection([resource], locale));
    lines.push('');
    lines.push('---');
    lines.push(L.footer);
  } else if (isCondition(resource)) {
    lines.push(`[${L.headerTag}]`);
    lines.push('');
    lines.push(formatConditionSection([resource], locale));
    lines.push('');
    lines.push('---');
    lines.push(L.footer);
  } else if (isDiagnosticReport(resource)) {
    lines.push(`[${L.headerTag}]`);
    lines.push('');
    lines.push(formatDiagnosticReportSection([resource], locale));
    lines.push('');
    lines.push('---');
    lines.push(L.footer);
  } else if (isMedicationStatement(resource)) {
    lines.push(`[${L.headerTag}]`);
    lines.push('');
    lines.push(formatMedicationStatementSection([resource], locale));
    lines.push('');
    lines.push('---');
    lines.push(L.footer);
  } else {
    lines.push(`[${L.headerTag}]`);
    lines.push('');
    lines.push(formatGenericResource(resource, locale));
    lines.push('');
    lines.push('---');
    lines.push(L.footer);
  }

  return lines.join('\n');
}

/**
 * 自單檔 `formatFHIRForLLM` 輸出移除尾端 `\n\n---\n` + 免責說明，供多檔合併後只保留一次結尾。
 */
export function stripFHIRLLMFooterBlockFromFormattedText(text: string, locale: Locale): string {
  const footer = getLabels(locale).footer;
  const suffix = `\n\n---\n${footer}`;
  if (text.endsWith(suffix)) {
    return text.slice(0, -suffix.length).replace(/\s+$/, '');
  }
  return text;
}

/** 多檔合併後統一附加的結尾（含分隔線與免責說明） */
export function getFHIRLLMFooterClosingBlock(locale: Locale): string {
  const footer = getLabels(locale).footer;
  return `\n\n---\n${footer}`;
}

// ============================================
// Bundle 格式化
// ============================================

function formatBundleForLLM(bundle: FHIRBundle, locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];

  const entryCount = bundle.entry?.length || 0;
  const timestamp = bundle.timestamp ? fmtDate(bundle.timestamp) : '';
  const metaParts = [
    `FHIR R5 Bundle (${bundle.type})`,
    locale === 'zh-TW' ? `共 ${entryCount} 筆資源` : `${entryCount} resources`,
    timestamp ? `${L.metaUpdated}: ${timestamp}` : '',
  ].filter(Boolean);

  lines.push(`[${L.headerTag}]`);
  lines.push(`${L.metaSource}: ${metaParts.join(' | ')}`);

  const patients: FHIRPatient[] = [];
  const conditions: FHIRCondition[] = [];
  const medications: FHIRMedicationStatement[] = [];
  const observations: FHIRObservation[] = [];
  const reports: FHIRDiagnosticReport[] = [];
  const others: FHIRResource[] = [];

  for (const entry of bundle.entry || []) {
    const r = entry.resource;
    if (!r) continue;
    if (isPatient(r)) patients.push(r);
    else if (isCondition(r)) conditions.push(r);
    else if (isMedicationStatement(r)) medications.push(r);
    else if (isObservation(r)) observations.push(r);
    else if (isDiagnosticReport(r)) reports.push(r);
    else others.push(r);
  }

  if (patients.length > 0) {
    lines.push('');
    for (const p of patients) {
      lines.push(formatPatientForLLM(p, locale));
    }
  }

  if (conditions.length > 0) {
    lines.push('');
    lines.push(formatConditionSection(conditions, locale));
  }

  if (medications.length > 0) {
    lines.push('');
    lines.push(formatMedicationStatementSection(medications, locale));
  }

  if (observations.length > 0) {
    lines.push('');
    lines.push(formatObservationSection(observations, locale));
  }

  if (reports.length > 0) {
    lines.push('');
    lines.push(formatDiagnosticReportSection(reports, locale));
  }

  for (const r of others) {
    lines.push('');
    lines.push(formatGenericResource(r, locale));
  }

  lines.push('');
  lines.push('---');
  lines.push(L.footer);

  return lines.join('\n');
}

// ============================================
// Patient 格式化
// ============================================

function formatPatientForLLM(patient: FHIRPatient, locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];

  lines.push(`## ${L.patientInfo}`);

  if (patient.name?.length) {
    lines.push(`- ${L.name}: ${fmtHumanName(patient.name[0])}`);
  }

  if (patient.gender) {
    lines.push(`- ${L.gender}: ${fmtGender(patient.gender, locale)}`);
  }

  if (patient.birthDate) {
    lines.push(`- ${L.birthDate}: ${patient.birthDate}`);
  }

  if (patient.identifier?.length) {
    for (const id of patient.identifier) {
      const label = id.type?.text || id.type?.coding?.[0]?.display || id.use || 'ID';
      lines.push(`- ${label}: ${id.value || '-'}`);
    }
  }

  if (patient.telecom?.length) {
    for (const tc of patient.telecom) {
      if (tc.system === 'phone') {
        const useLabel = fmtContactUse(tc.use, locale);
        lines.push(`- ${L.phone}: ${tc.value}${useLabel ? ` (${useLabel})` : ''}`);
      } else if (tc.system === 'email') {
        lines.push(`- ${L.email}: ${tc.value}`);
      }
    }
  }

  if (patient.address?.length) {
    const addr = patient.address[0];
    if (addr.text) {
      lines.push(`- ${L.address}: ${addr.text}`);
    }
  }

  if (patient.maritalStatus) {
    lines.push(`- ${L.maritalStatus}: ${fmtCC(patient.maritalStatus)}`);
  }

  if (patient.contact?.length) {
    for (const c of patient.contact) {
      const rel = c.relationship?.length ? fmtCC(c.relationship[0]) : '';
      const name = c.name ? fmtHumanName(c.name) : '';
      const phone = c.telecom?.find(t => t.system === 'phone')?.value || '';
      const parts = [name, phone ? `${L.phone}: ${phone}` : ''].filter(Boolean);
      const label = rel || L.emergencyContact;
      lines.push(`- ${label}: ${parts.join(' (') + (phone ? ')' : '')}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Condition 區段
// ============================================

function formatConditionSection(conditions: FHIRCondition[], locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];
  lines.push(`## ${L.conditionSection}`);

  for (const cond of conditions) {
    const title = cond.code ? fmtCC(cond.code) : (cond.id || 'Condition');
    const codes = cond.code ? fmtCodingTags(cond.code) : '';
    lines.push(`### ${title}${codes ? ` ${codes}` : ''}`);

    if (cond.clinicalStatus) {
      lines.push(`- ${L.clinicalStatus}: ${fmtCC(cond.clinicalStatus)} (${fmtCodingCode(cond.clinicalStatus)})`);
    }

    if (cond.verificationStatus) {
      lines.push(`- ${L.verificationStatus}: ${fmtCC(cond.verificationStatus)} (${fmtCodingCode(cond.verificationStatus)})`);
    }

    if (cond.severity) {
      const sevCodes = fmtCodingTags(cond.severity);
      lines.push(`- ${L.severity}: ${fmtCC(cond.severity)}${sevCodes ? ` ${sevCodes}` : ''}`);
    }

    if (cond.onsetDateTime) {
      lines.push(`- ${L.onsetDate}: ${fmtDate(cond.onsetDateTime)}`);
    }

    if (cond.recordedDate) {
      lines.push(`- ${L.recordedDate}: ${fmtDate(cond.recordedDate)}`);
    }

    if (cond.bodySite?.length) {
      const sites = cond.bodySite.map(fmtCC).join(', ');
      lines.push(`- ${L.bodySite}: ${sites}`);
    }

    if (cond.participant?.length) {
      for (const p of cond.participant) {
        const role = p.function ? fmtCC(p.function) : '';
        const actor = p.actor.display || p.actor.reference || '';
        if (actor) {
          lines.push(`- ${role || L.participant}: ${actor}`);
        }
      }
    }

    if (cond.note?.length) {
      lines.push(`- ${L.clinicalNote}: ${fmtNotes(cond.note)}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// MedicationStatement 區段
// ============================================

function formatMedicationStatementSection(meds: FHIRMedicationStatement[], locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];
  lines.push(`## ${L.medicationSection}`);

  for (const med of meds) {
    const title = med.medication?.concept ? fmtCC(med.medication.concept) : (med.id || 'Medication');
    const codes = med.medication?.concept ? fmtCodingTags(med.medication.concept) : '';
    lines.push(`### ${title}${codes ? ` ${codes}` : ''}`);

    lines.push(`- ${L.status}: ${med.status}`);

    if (med.category?.length) {
      lines.push(`- ${L.medCategory}: ${med.category.map(fmtCC).join(', ')}`);
    }

    if (med.renderedDosageInstruction) {
      lines.push(`- ${L.dosage}: ${med.renderedDosageInstruction}`);
    } else if (med.dosage?.length && med.dosage[0].text) {
      lines.push(`- ${L.dosage}: ${med.dosage[0].text}`);
    }

    if (med.dosage?.length) {
      const d = med.dosage[0];
      if (d.route) {
        lines.push(`- ${L.route}: ${fmtCC(d.route)}`);
      }
      if (d.timing?.code) {
        const whenParts = d.timing.repeat?.when?.length
          ? ` (${d.timing.repeat.when.join(', ')})`
          : '';
        lines.push(`- ${L.frequency}: ${fmtCC(d.timing.code)}${whenParts}`);
      }
      if (d.doseAndRate?.length) {
        const dr = d.doseAndRate[0];
        if (dr.doseQuantity) {
          lines.push(`- ${L.singleDose}: ${fmtQuantity(dr.doseQuantity)}`);
        }
      }
    }

    if (med.effectiveDateTime) {
      lines.push(`- ${L.startDate}: ${fmtDate(med.effectiveDateTime)}`);
    } else if (med.effectivePeriod?.start) {
      lines.push(`- ${L.startDate}: ${fmtDate(med.effectivePeriod.start)}`);
    }

    if (med.reason?.length) {
      const reasons = med.reason
        .map(r => {
          if (r.concept) {
            const tags = fmtCodingTags(r.concept);
            return `${fmtCC(r.concept)}${tags ? ` ${tags}` : ''}`;
          }
          return r.reference?.display || '';
        })
        .filter(Boolean);
      if (reasons.length) {
        lines.push(`- ${L.medReason}: ${reasons.join('; ')}`);
      }
    }

    if (med.adherence) {
      lines.push(`- ${L.adherence}: ${fmtCC(med.adherence.code)}`);
    }

    if (med.informationSource?.length) {
      const sources = med.informationSource.map(r => r.display || r.reference || '').filter(Boolean);
      if (sources.length) {
        lines.push(`- ${L.prescriber}: ${sources.join(', ')}`);
      }
    }

    if (med.note?.length) {
      lines.push(`- ${L.clinicalNote}: ${fmtNotes(med.note)}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Observation 區段
// ============================================

function formatObservationSection(observations: FHIRObservation[], locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];
  lines.push(`## ${L.observationSection}`);

  for (const obs of observations) {
    const title = fmtCC(obs.code);
    const codes = fmtCodingTags(obs.code);
    lines.push(`### ${title}${codes ? ` ${codes}` : ''}`);

    if (obs.effectiveDateTime) {
      lines.push(`- ${L.measureDate}: ${fmtDate(obs.effectiveDateTime)}`);
    }

    if (obs.category?.length) {
      const cats = obs.category.map(c => {
        const code = c.coding?.[0]?.code || '';
        return `${fmtCC(c)}${code ? ` (${code})` : ''}`;
      }).join(', ');
      lines.push(`- ${L.category}: ${cats}`);
    }

    lines.push(`- ${L.status}: ${obs.status}`);

    // Top-level value
    const topValue = fmtObservationValue(obs);
    if (topValue) {
      lines.push(`- ${L.value}: ${topValue}`);
    }

    if (obs.interpretation?.length) {
      lines.push(`- ${L.interpretation}: ${obs.interpretation.map(fmtCC).join(', ')}`);
    }

    if (obs.referenceRange?.length) {
      for (const rr of obs.referenceRange) {
        lines.push(`- ${L.referenceRange}: ${fmtRefRange(rr)}`);
      }
    }

    // Components
    if (obs.component?.length) {
      lines.push(`- ${L.components}:`);
      for (const comp of obs.component) {
        const compTitle = fmtCC(comp.code);
        const compValue = fmtComponentValue(comp);
        const compInterp = comp.interpretation?.length
          ? ` — ${comp.interpretation.map(fmtCC).join(', ')}`
          : '';
        const compCodes = fmtCodingTags(comp.code);
        lines.push(`  - ${compTitle}: ${compValue}${compInterp}${compCodes ? ` ${compCodes}` : ''}`);
      }
    }

    if (obs.performer?.length) {
      const performers = obs.performer.map(r => r.display || r.reference || '').filter(Boolean);
      if (performers.length) {
        lines.push(`- ${L.performer}: ${performers.join(', ')}`);
      }
    }

    if (obs.note?.length) {
      lines.push(`- ${L.note}: ${fmtNotes(obs.note)}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// DiagnosticReport 區段
// ============================================

function formatDiagnosticReportSection(reports: FHIRDiagnosticReport[], locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];
  lines.push(`## ${L.reportSection}`);

  for (const rpt of reports) {
    const title = fmtCC(rpt.code);
    const codes = fmtCodingTags(rpt.code);
    lines.push(`### ${title}${codes ? ` ${codes}` : ''}`);

    if (rpt.effectiveDateTime) {
      lines.push(`- ${L.reportDate}: ${fmtDate(rpt.effectiveDateTime)}`);
    }

    if (rpt.issued) {
      lines.push(`- ${L.reportIssued}: ${fmtDate(rpt.issued)}`);
    }

    if (rpt.category?.length) {
      lines.push(`- ${L.category}: ${rpt.category.map(fmtCC).join(', ')}`);
    }

    lines.push(`- ${L.status}: ${rpt.status}`);

    if (rpt.performer?.length) {
      const performers = rpt.performer.map(r => r.display || r.reference || '').filter(Boolean);
      if (performers.length) {
        lines.push(`- ${L.performer}: ${performers.join(', ')}`);
      }
    }

    if (rpt.resultsInterpreter?.length) {
      const interpreters = rpt.resultsInterpreter.map(r => r.display || r.reference || '').filter(Boolean);
      if (interpreters.length) {
        lines.push(`- ${L.interpreter}: ${interpreters.join(', ')}`);
      }
    }

    if (rpt.conclusion) {
      lines.push(`- ${L.conclusion}: ${rpt.conclusion}`);
    }

    if (rpt.conclusionCode?.length) {
      for (const cc of rpt.conclusionCode) {
        const tags = fmtCodingTags(cc);
        lines.push(`- ${L.conclusionCode}: ${fmtCC(cc)}${tags ? ` ${tags}` : ''}`);
      }
    }

    if (rpt.result?.length) {
      lines.push(`- ${L.resultItems}:`);
      for (const ref of rpt.result) {
        lines.push(`  - ${ref.display || ref.reference || '-'}`);
      }
    }

    if (rpt.note?.length) {
      lines.push(`- ${L.note}: ${fmtNotes(rpt.note)}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Generic fallback
// ============================================

function formatGenericResource(resource: FHIRResource, locale: Locale): string {
  const L = getLabels(locale);
  const lines: string[] = [];
  lines.push(`## ${resource.resourceType}`);
  if (resource.id) {
    lines.push(`- ID: ${resource.id}`);
  }
  lines.push(`- ${L.resourceType}: ${resource.resourceType}`);
  return lines.join('\n');
}

// ============================================
// 格式化輔助函數
// ============================================

function fmtHumanName(name: HumanName): string {
  if (name.text) return name.text;
  const parts: string[] = [];
  if (name.family) parts.push(name.family);
  if (name.given?.length) parts.push(name.given.join(''));
  return parts.join('') || '-';
}

function fmtCC(cc: CodeableConcept): string {
  if (cc.text) return cc.text;
  if (cc.coding?.length) {
    return cc.coding[0].display || cc.coding[0].code || '-';
  }
  return '-';
}

function fmtCodingCode(cc: CodeableConcept): string {
  if (cc.coding?.length) {
    return cc.coding[0].code || '';
  }
  return '';
}

const SYSTEM_SHORT_NAMES: Record<string, string> = {
  'http://loinc.org': 'LOINC',
  'http://snomed.info/sct': 'SNOMED',
  'http://hl7.org/fhir/sid/icd-10-cm': 'ICD-10',
  'http://hl7.org/fhir/sid/icd-10': 'ICD-10',
  'http://www.nlm.nih.gov/research/umls/rxnorm': 'RxNorm',
  'http://www.whocc.no/atc': 'ATC',
  'http://hl7.org/fhir/sid/ndc': 'NDC',
  'http://unitsofmeasure.org': 'UCUM',
};

function fmtCodingTags(cc: CodeableConcept): string {
  if (!cc.coding?.length) return '';
  const tags = cc.coding
    .map(c => {
      const sys = c.system ? (SYSTEM_SHORT_NAMES[c.system] || '') : '';
      if (sys && c.code) return `${sys}: ${c.code}`;
      return '';
    })
    .filter(Boolean);
  return tags.length ? `[${tags.join(' | ')}]` : '';
}

function fmtQuantity(q: Quantity): string {
  if (q.value === undefined) return '-';
  const unit = q.unit || q.code || '';
  return `${q.value}${unit ? ' ' + unit : ''}`;
}

function fmtDate(dt: string): string {
  try {
    if (dt.length <= 10) return dt;
    const date = new Date(dt);
    if (isNaN(date.getTime())) return dt;
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Taipei',
    });
  } catch {
    return dt;
  }
}

function fmtGender(gender: string, locale: Locale): string {
  const map: Record<string, { zhTW: string; en: string }> = {
    male: { zhTW: '男', en: 'Male' },
    female: { zhTW: '女', en: 'Female' },
    other: { zhTW: '其他', en: 'Other' },
    unknown: { zhTW: '未知', en: 'Unknown' },
  };
  return map[gender]?.[locale === 'zh-TW' ? 'zhTW' : 'en'] || gender;
}

function fmtContactUse(use: string | undefined, locale: Locale): string {
  if (!use) return '';
  const map: Record<string, { zhTW: string; en: string }> = {
    home: { zhTW: '住家', en: 'Home' },
    work: { zhTW: '公司', en: 'Work' },
    temp: { zhTW: '臨時', en: 'Temp' },
    mobile: { zhTW: '手機', en: 'Mobile' },
    old: { zhTW: '舊', en: 'Old' },
  };
  return map[use]?.[locale === 'zh-TW' ? 'zhTW' : 'en'] || use;
}

function fmtNotes(notes: Annotation[]): string {
  return notes.map(n => n.text).join(' ');
}

function fmtObservationValue(obs: FHIRObservation | ObservationComponent): string {
  if ('valueQuantity' in obs && obs.valueQuantity) return fmtQuantity(obs.valueQuantity);
  if ('valueString' in obs && obs.valueString) return obs.valueString;
  if ('valueCodeableConcept' in obs && obs.valueCodeableConcept) return fmtCC(obs.valueCodeableConcept);
  if ('valueBoolean' in obs && obs.valueBoolean !== undefined) return String(obs.valueBoolean);
  if ('valueInteger' in obs && obs.valueInteger !== undefined) return String(obs.valueInteger);
  return '';
}

function fmtComponentValue(comp: ObservationComponent): string {
  return fmtObservationValue(comp) || '-';
}

function fmtRefRange(rr: ObservationReferenceRange): string {
  const parts: string[] = [];
  if (rr.low && rr.high) {
    parts.push(`${fmtQuantity(rr.low)} - ${fmtQuantity(rr.high)}`);
  } else if (rr.low) {
    parts.push(`>= ${fmtQuantity(rr.low)}`);
  } else if (rr.high) {
    parts.push(`<= ${fmtQuantity(rr.high)}`);
  }
  if (rr.type) {
    parts.push(`(${fmtCC(rr.type)})`);
  } else if (rr.text) {
    parts.push(`(${rr.text})`);
  }
  return parts.join(' ') || rr.text || '-';
}

// ============================================
// 雙語標籤
// ============================================

function getLabels(locale: Locale) {
  return locale === 'zh-TW' ? labelsZhTW : labelsEn;
}

const labelsZhTW = {
  headerTag: 'FHIR 臨床資料匯入',
  metaSource: '資料來源',
  metaUpdated: '更新時間',
  footer: '以上為 FHIR R5 標準格式匯入的病患臨床資料，請根據這些資料進行醫療分析與建議。',

  patientInfo: '病人資訊',
  name: '姓名',
  gender: '性別',
  birthDate: '出生日期',
  phone: '電話',
  email: '電子郵件',
  address: '地址',
  maritalStatus: '婚姻狀態',
  emergencyContact: '緊急聯絡人',

  conditionSection: '診斷/病況',
  clinicalStatus: '臨床狀態',
  verificationStatus: '驗證狀態',
  severity: '嚴重程度',
  onsetDate: '發病日期',
  recordedDate: '紀錄日期',
  bodySite: '受影響部位',
  participant: '參與者',
  clinicalNote: '臨床筆記',

  medicationSection: '用藥紀錄',
  status: '狀態',
  medCategory: '用藥類別',
  dosage: '劑量',
  route: '給藥途徑',
  frequency: '用藥頻率',
  singleDose: '單次劑量',
  startDate: '開始日期',
  medReason: '用藥原因',
  adherence: '服藥依從性',
  prescriber: '處方醫師',

  observationSection: '檢驗觀察紀錄',
  measureDate: '測量日期',
  category: '類別',
  value: '數值',
  interpretation: '判讀',
  referenceRange: '參考範圍',
  components: '組成項目',
  performer: '執行者',
  note: '備註',

  reportSection: '診斷報告',
  reportDate: '報告日期',
  reportIssued: '報告發出',
  interpreter: '判讀醫師',
  conclusion: '結論',
  conclusionCode: '結論代碼',
  resultItems: '包含結果項目',

  resourceType: '資源類型',
};

const labelsEn = {
  headerTag: 'FHIR Clinical Data Import',
  metaSource: 'Source',
  metaUpdated: 'Updated',
  footer: 'The above is patient clinical data imported in FHIR R5 standard format. Please analyze this data and provide medical insights and recommendations.',

  patientInfo: 'Patient Information',
  name: 'Name',
  gender: 'Gender',
  birthDate: 'Date of Birth',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  maritalStatus: 'Marital Status',
  emergencyContact: 'Emergency Contact',

  conditionSection: 'Conditions / Diagnoses',
  clinicalStatus: 'Clinical Status',
  verificationStatus: 'Verification Status',
  severity: 'Severity',
  onsetDate: 'Onset Date',
  recordedDate: 'Recorded Date',
  bodySite: 'Body Site',
  participant: 'Participant',
  clinicalNote: 'Clinical Note',

  medicationSection: 'Medication Records',
  status: 'Status',
  medCategory: 'Category',
  dosage: 'Dosage',
  route: 'Route',
  frequency: 'Frequency',
  singleDose: 'Single Dose',
  startDate: 'Start Date',
  medReason: 'Reason',
  adherence: 'Adherence',
  prescriber: 'Prescriber',

  observationSection: 'Observations / Lab Results',
  measureDate: 'Measurement Date',
  category: 'Category',
  value: 'Value',
  interpretation: 'Interpretation',
  referenceRange: 'Reference Range',
  components: 'Components',
  performer: 'Performer',
  note: 'Note',

  reportSection: 'Diagnostic Reports',
  reportDate: 'Report Date',
  reportIssued: 'Report Issued',
  interpreter: 'Results Interpreter',
  conclusion: 'Conclusion',
  conclusionCode: 'Conclusion Code',
  resultItems: 'Result Items',

  resourceType: 'Resource Type',
};
