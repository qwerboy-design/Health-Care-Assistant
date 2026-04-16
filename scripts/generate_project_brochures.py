from __future__ import annotations

import subprocess
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "Reference documents" / "brochures"

BROWSER_CANDIDATES = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
]


def render_feature_card(title: str, body: str) -> str:
    return f"""
    <article class="card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
    """


def render_layer(title: str, items: list[str]) -> str:
    item_list = "".join(f"<li>{item}</li>" for item in items)
    return f"""
    <section class="layer">
      <h3>{title}</h3>
      <ul>{item_list}</ul>
    </section>
    """


def render_stack(items: list[str]) -> str:
    return "".join(f"<span class=\"pill\">{item}</span>" for item in items)


def render_metric_cards(items: list[dict[str, str]]) -> str:
    return "".join(
        f"""
        <article class="metric-card">
          <div class="metric-value">{item["value"]}</div>
          <div class="metric-label">{item["label"]}</div>
          <p>{item["body"]}</p>
        </article>
        """
        for item in items
    )


def render_flow(items: list[str]) -> str:
    parts: list[str] = []
    for index, item in enumerate(items, start=1):
        parts.append(
            f"""
            <div class="flow-step">
              <span class="flow-index">{index:02d}</span>
              <p>{item}</p>
            </div>
            """
        )
    return "".join(parts)


def render_process_diagram(items: list[dict[str, str]]) -> str:
    parts: list[str] = []
    total = len(items)
    for index, item in enumerate(items):
        connector = '<div class="process-arrow">→</div>' if index < total - 1 else ""
        parts.append(
            f"""
            <div class="process-item">
              <span class="process-step">{item["step"]}</span>
              <h3>{item["title"]}</h3>
              <p>{item["body"]}</p>
            </div>
            {connector}
            """
        )
    return "".join(parts)


def build_html(content: dict[str, object]) -> str:
    metric_cards = render_metric_cards(content["metric_cards"])  # type: ignore[index]
    feature_cards = "".join(
        render_feature_card(card["title"], card["body"])
        for card in content["feature_cards"]  # type: ignore[index]
    )
    architecture_layers = "".join(
        render_layer(layer["title"], layer["items"])
        for layer in content["architecture_layers"]  # type: ignore[index]
    )
    governance_cards = "".join(
        render_feature_card(card["title"], card["body"])
        for card in content["governance_cards"]  # type: ignore[index]
    )
    process_diagram = render_process_diagram(content["process_items"])  # type: ignore[index]
    use_cases = "".join(
        f"<li>{item}</li>" for item in content["use_cases"]  # type: ignore[index]
    )

    return f"""<!DOCTYPE html>
<html lang="{content["lang_code"]}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{content["file_stem"]}</title>
  <style>
    @page {{
      size: A4;
      margin: 10mm;
    }}

    * {{
      box-sizing: border-box;
    }}

    html, body {{
      margin: 0;
      padding: 0;
      background: #e7eefc;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    body {{
      font-family: {content["font_family"]};
      line-height: 1.55;
    }}

    .page {{
      min-height: calc(297mm - 20mm);
      padding: 16mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background:
        linear-gradient(180deg, rgba(248, 251, 255, 0.98) 0%, rgba(239, 245, 255, 0.98) 100%);
      border: 1px solid #d6e2f4;
      border-radius: 22px;
      box-shadow: 0 22px 60px rgba(15, 23, 42, 0.1);
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }}

    .page:last-child {{
      page-break-after: auto;
    }}

    .page::before {{
      content: "";
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, #0f3d91 0%, #2563eb 55%, #7fb3ff 100%);
    }}

    .hero {{
      background:
        radial-gradient(circle at top right, rgba(147, 197, 253, 0.24), transparent 30%),
        radial-gradient(circle at bottom left, rgba(96, 165, 250, 0.22), transparent 26%),
        linear-gradient(135deg, #0b1f47 0%, #123a82 48%, #2563eb 100%);
      color: #ffffff;
    }}

    .hero::before {{
      background: linear-gradient(90deg, #dbeafe 0%, #ffffff 45%, #93c5fd 100%);
    }}

    .eyebrow {{
      display: inline-block;
      padding: 7px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
    }}

    h1 {{
      margin: 18px 0 14px;
      font-size: 32px;
      line-height: 1.18;
    }}

    h2 {{
      margin: 0 0 10px;
      font-size: 24px;
      line-height: 1.25;
      color: #0f3d91;
    }}

    h3 {{
      margin: 0 0 10px;
      font-size: 16px;
      line-height: 1.35;
      color: #0f3d91;
    }}

    .hero h2,
    .hero h3 {{
      color: #ffffff;
    }}

    p {{
      margin: 0;
      font-size: 13.5px;
    }}

    .lead {{
      max-width: 670px;
      font-size: 15px;
      color: rgba(255, 255, 255, 0.92);
    }}

    .section-intro {{
      max-width: 700px;
      margin-bottom: 18px;
      color: #334155;
    }}

    .section-label {{
      display: inline-block;
      margin-bottom: 10px;
      color: #2563eb;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }}

    .pill-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 24px;
    }}

    .pill {{
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.17);
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 12px;
      font-weight: 600;
    }}

    .page:not(.hero) .pill {{
      background: #dceaff;
      border-color: #bfd5fb;
      color: #103f90;
    }}

    .grid-two,
    .grid-three {{
      display: grid;
      gap: 14px;
    }}

    .grid-two {{
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }}

    .grid-three {{
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }}

    .card,
    .layer,
    .callout,
    .metric-card,
    .process-item {{
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid #d9e5f6;
      border-radius: 18px;
      padding: 16px;
      position: relative;
      z-index: 1;
    }}

    .hero .callout {{
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.18);
    }}

    .metric-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 28px;
    }}

    .metric-card {{
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      min-height: 164px;
    }}

    .metric-value {{
      font-size: 30px;
      line-height: 1;
      font-weight: 800;
      margin-bottom: 8px;
    }}

    .metric-label {{
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 10px;
      color: rgba(255, 255, 255, 0.86);
    }}

    .metric-card p {{
      color: rgba(255, 255, 255, 0.88);
      font-size: 12.5px;
    }}

    .card p,
    .layer li,
    .callout p,
    li {{
      color: #334155;
    }}

    ul {{
      margin: 0;
      padding-left: 18px;
    }}

    li + li {{
      margin-top: 8px;
    }}

    .layer-wrap {{
      display: grid;
      grid-template-columns: 1.1fr 1.2fr 1.1fr;
      gap: 14px;
      align-items: stretch;
      margin-top: 14px;
    }}

    .process-shell {{
      margin-top: 6px;
      padding: 18px;
      border-radius: 20px;
      background: linear-gradient(180deg, #edf4ff 0%, #f7faff 100%);
      border: 1px solid #d6e4f7;
    }}

    .process-diagram {{
      display: grid;
      grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
      gap: 10px;
      align-items: stretch;
    }}

    .process-item {{
      min-height: 166px;
      background: #ffffff;
    }}

    .process-step {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 42px;
      height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: #dceaff;
      color: #0f3d91;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 12px;
    }}

    .process-arrow {{
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3b82f6;
      font-size: 26px;
      font-weight: 800;
    }}

    .arrow-strip {{
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 16px 0 10px;
      color: #1d4ed8;
      font-size: 14px;
      font-weight: 700;
    }}

    .arrow {{
      width: 22px;
      height: 2px;
      background: #60a5fa;
      position: relative;
      top: -1px;
    }}

    .arrow::after {{
      content: "";
      position: absolute;
      right: -1px;
      top: -4px;
      border-left: 8px solid #60a5fa;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
    }}

    .flow {{
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }}

    .flow-step {{
      background: #ffffff;
      border: 1px solid #d7e3f6;
      border-radius: 16px;
      padding: 14px;
      min-height: 120px;
    }}

    .flow-index {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #dceaff;
      color: #0f3d91;
      font-weight: 800;
      font-size: 13px;
      margin-bottom: 12px;
    }}

    .footer-note {{
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.25);
      font-size: 11px;
      color: #64748b;
    }}

    .hero .footer-note {{
      color: rgba(255, 255, 255, 0.75);
      border-top-color: rgba(255, 255, 255, 0.18);
    }}

    .small-stack {{
      margin-top: 18px;
    }}
  </style>
</head>
<body>
  <section class="page hero">
    <div>
      <span class="eyebrow">{content["hero_label"]}</span>
      <h1>{content["title"]}</h1>
      <p class="lead">{content["subtitle"]}</p>
      <div class="callout" style="margin-top: 28px;">
        <h3>{content["overview_title"]}</h3>
        <p>{content["overview_body"]}</p>
      </div>
      <div class="pill-row">{render_stack(content["hero_stack"])}</div>
      <div class="metric-grid">{metric_cards}</div>
    </div>
    <div class="footer-note">{content["disclaimer"]}</div>
  </section>

  <section class="page">
    <div>
      <span class="section-label">{content["capability_label"]}</span>
      <h2>{content["capability_title"]}</h2>
      <p class="section-intro">{content["capability_intro"]}</p>
      <div class="grid-two">{feature_cards}</div>
    </div>
    <div class="footer-note">{content["footer_tagline"]}</div>
  </section>

  <section class="page">
    <div>
      <span class="section-label">{content["architecture_label"]}</span>
      <h2>{content["architecture_title"]}</h2>
      <p class="section-intro">{content["architecture_intro"]}</p>
      <div class="process-shell">
        <h3>{content["process_title"]}</h3>
        <p class="section-intro" style="margin-bottom: 14px;">{content["process_intro"]}</p>
        <div class="process-diagram">{process_diagram}</div>
      </div>
      <div class="layer-wrap">{architecture_layers}</div>
      <div class="arrow-strip">
        <span>{content["flow_caption_left"]}</span>
        <span class="arrow"></span>
        <span>{content["flow_caption_center"]}</span>
        <span class="arrow"></span>
        <span>{content["flow_caption_right"]}</span>
      </div>
      <div class="flow">{render_flow(content["flow_steps"])}</div>
      <div class="small-stack">
        <h3>{content["stack_title"]}</h3>
        <div class="pill-row">{render_stack(content["stack_items"])}</div>
      </div>
    </div>
    <div class="footer-note">{content["disclaimer"]}</div>
  </section>

  <section class="page">
    <div>
      <span class="section-label">{content["governance_label"]}</span>
      <h2>{content["governance_title"]}</h2>
      <p class="section-intro">{content["governance_intro"]}</p>
      <div class="grid-three">{governance_cards}</div>
      <div class="grid-two" style="margin-top: 18px;">
        <section class="card">
          <h3>{content["use_case_title"]}</h3>
          <ul>{use_cases}</ul>
        </section>
        <section class="card">
          <h3>{content["closing_title"]}</h3>
          <p>{content["closing_body"]}</p>
        </section>
      </div>
    </div>
    <div class="footer-note">{content["footer_tagline"]}</div>
  </section>
</body>
</html>
"""


CONTENT = {
    "en": {
        "lang_code": "en",
        "font_family": '"Segoe UI", Inter, Arial, sans-serif',
        "file_stem": "health-care-assistant-brochure-en",
        "hero_label": "Project Brochure",
        "title": "Health Care Assistant",
        "subtitle": (
            "A clinical AI support platform for structured analysis, controlled access, "
            "conversation traceability, and operational governance."
        ),
        "overview_title": "Why it matters",
        "overview_body": (
            "Health Care Assistant brings secure user onboarding, multi-turn AI conversations, "
            "clinical-context intake, model governance, and credit-based usage control into a "
            "single Next.js application. It is designed for organizations that want practical AI "
            "support workflows without losing visibility over who can access the system, which "
            "models are used, and how activity is recorded."
        ),
        "hero_stack": [
            "Next.js 14 App Router",
            "Supabase + PostgreSQL",
            "Anthropic Claude",
            "Cloudflare R2",
            "JWT + OTP + Google OAuth",
        ],
        "metric_cards": [
            {
                "value": "3",
                "label": "Access Paths",
                "body": "Password, email OTP, and Google OAuth help lower adoption friction while keeping controlled onboarding.",
            },
            {
                "value": "4",
                "label": "Clinical Modes",
                "body": "Lab, radiology, medical records, and medication analysis align the workspace to common healthcare use cases.",
            },
            {
                "value": "1",
                "label": "Governed Platform",
                "body": "Identity, AI interaction, storage, pricing, and admin control are managed within one application boundary.",
            },
        ],
        "capability_label": "Executive Summary",
        "capability_title": "Key Capabilities",
        "capability_intro": (
            "The platform combines end-user workflow features with the controls healthcare teams "
            "typically need for adoption, oversight, and staged rollout."
        ),
        "feature_cards": [
            {
                "title": "Flexible Access and Approval",
                "body": (
                    "Users can sign in with password, email OTP, or Google OAuth. New accounts stay "
                    "under approval control before clinical chat functions become available."
                ),
            },
            {
                "title": "Clinical AI Workspace",
                "body": (
                    "The main workspace supports multi-turn conversations, selectable workload depth, "
                    "and clinical analysis modes for lab, radiology, records, and medication scenarios."
                ),
            },
            {
                "title": "File and Context Intake",
                "body": (
                    "The solution accepts common document and image formats, supports screenshots, "
                    "and includes FHIR-oriented import and formatting workflows for richer context."
                ),
            },
            {
                "title": "Conversation Traceability",
                "body": (
                    "Persistent conversation history, downloadable logs, and saved message records help "
                    "teams revisit prior AI discussions and keep an auditable trail."
                ),
            },
            {
                "title": "Model and Cost Governance",
                "body": (
                    "Credits are checked before AI use, deducted per model policy, and written to a "
                    "transaction ledger. Admins can manage model availability and pricing."
                ),
            },
            {
                "title": "Organization-ready Experience",
                "body": (
                    "Customer-specific UI settings, bilingual interface support, and role-based admin "
                    "functions make the platform easier to align with institutional workflows."
                ),
            },
        ],
        "architecture_title": "Architecture at a Glance",
        "architecture_intro": (
            "The application follows a full-stack Next.js design: the browser experience, API routes, "
            "business logic, and integrations are organized within one codebase for simpler delivery "
            "and consistent governance."
        ),
        "architecture_label": "Operating Model",
        "process_title": "Simple Delivery Flow",
        "process_intro": (
            "This simplified flow illustrates how a governed clinical AI request moves through the platform."
        ),
        "process_items": [
            {
                "step": "Step 1",
                "title": "Authenticate",
                "body": "Verify identity, session, and approval status before protected workflows begin.",
            },
            {
                "step": "Step 2",
                "title": "Prepare Context",
                "body": "Collect prompt, workload level, clinical mode, model selection, and optional files.",
            },
            {
                "step": "Step 3",
                "title": "Run AI Policy",
                "body": "Validate input, enforce credit rules, and route the request through the AI client layer.",
            },
            {
                "step": "Step 4",
                "title": "Record Results",
                "body": "Store messages, update credits, and retain conversation history for follow-up and review.",
            },
        ],
        "architecture_layers": [
            {
                "title": "Client Experience",
                "items": [
                    "Login and registration pages",
                    "Chat workspace and conversation history",
                    "Admin dashboard and settings-driven UI",
                    "Traditional Chinese and English interface support",
                ],
            },
            {
                "title": "Application Core",
                "items": [
                    "Next.js App Router pages and route handlers",
                    "Validation with Zod and session checks with JWT cookies",
                    "Workload mapping and clinical function routing",
                    "Conversation, credit, and model orchestration logic",
                ],
            },
            {
                "title": "Data and Services",
                "items": [
                    "Supabase for users, sessions, messages, credits, and pricing",
                    "Anthropic Claude for AI responses",
                    "Resend for OTP email and Google OAuth for federated sign-in",
                    "Cloudflare R2 for uploaded files and artifacts",
                ],
            },
        ],
        "flow_caption_left": "User request",
        "flow_caption_center": "Controlled AI processing",
        "flow_caption_right": "Recorded outcome",
        "flow_steps": [
            "Authenticate the user and verify account status.",
            "Select workload depth, analysis mode, model, and optional files.",
            "Validate payloads and resolve credit and pricing policy.",
            "Send structured context to Claude through the AI client layer.",
            "Save messages, update credits, and keep history available.",
        ],
        "stack_title": "Technology Stack",
        "stack_items": [
            "React 18",
            "TypeScript 5",
            "Tailwind CSS",
            "Supabase",
            "PostgreSQL",
            "jose (JWT)",
            "bcryptjs",
            "Zod",
            "Resend",
            "Google OAuth",
            "Cloudflare R2",
            "Vitest",
        ],
        "governance_title": "Security, Governance, and Operations",
        "governance_intro": (
            "Beyond the chat interface, the project emphasizes controlled access, predictable cost "
            "management, and operational visibility."
        ),
        "governance_label": "Governance",
        "governance_cards": [
            {
                "title": "Session and Access Control",
                "body": (
                    "JWT sessions are stored in HttpOnly cookies. Approval status and admin role checks "
                    "help enforce who can enter protected workflows."
                ),
            },
            {
                "title": "Validation and Abuse Protection",
                "body": (
                    "API payloads are validated with Zod, passwords are hashed with bcrypt, and rate "
                    "limits reduce OTP and login abuse risk."
                ),
            },
            {
                "title": "Operational Transparency",
                "body": (
                    "Credits, pricing, customer records, and model states are surfaced through admin "
                    "APIs so teams can monitor adoption and usage behavior."
                ),
            },
        ],
        "use_case_title": "Ideal Use Cases",
        "use_cases": [
            "Clinical support conversations around lab reports and structured observations",
            "Radiology-oriented discussions with image or document attachments",
            "Medical record summarization with controlled conversation history",
            "Medication review workflows with model-cost awareness",
        ],
        "closing_title": "Deployment Value",
        "closing_body": (
            "Health Care Assistant is suitable for teams that want one governed platform covering "
            "authentication, AI interactions, storage, and cost tracking. The current architecture is "
            "well positioned for phased rollout, customer-level customization, and future healthcare "
            "workflow extensions."
        ),
        "disclaimer": (
            "Built for clinical support workflows. It should operate under organizational privacy, "
            "security, and professional-review policies rather than as a standalone diagnosis system."
        ),
        "footer_tagline": "Health Care Assistant | Structured Clinical AI Support with Governance",
    },
    "ko": {
        "lang_code": "ko",
        "font_family": '"Malgun Gothic", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif',
        "file_stem": "health-care-assistant-brochure-ko",
        "hero_label": "Project Brochure",
        "title": "Health Care Assistant",
        "subtitle": (
            "구조화된 임상 분석, 통제된 접근, 대화 이력 추적, 운영 거버넌스를 지원하는 "
            "Clinical AI Support Platform"
        ),
        "overview_title": "핵심 가치",
        "overview_body": (
            "Health Care Assistant는 안전한 사용자 온보딩, 다회차 AI 대화, 임상 문맥 입력, "
            "모델 운영 관리, 크레딧 기반 사용 통제를 하나의 Next.js 애플리케이션으로 통합합니다. "
            "누가 시스템에 접근하는지, 어떤 모델이 사용되는지, 활동이 어떻게 기록되는지를 "
            "가시적으로 관리하려는 조직에 적합합니다."
        ),
        "hero_stack": [
            "Next.js 14 App Router",
            "Supabase + PostgreSQL",
            "Anthropic Claude",
            "Cloudflare R2",
            "JWT + OTP + Google OAuth",
        ],
        "metric_cards": [
            {
                "value": "3",
                "label": "Access Paths",
                "body": "비밀번호, 이메일 OTP, Google OAuth를 통해 도입 장벽을 낮추면서도 통제된 온보딩을 유지합니다.",
            },
            {
                "value": "4",
                "label": "Clinical Modes",
                "body": "검사, 영상, 병력, 약물 분석 모드로 의료 현장의 대표 시나리오에 맞춘 작업 공간을 제공합니다.",
            },
            {
                "value": "1",
                "label": "Governed Platform",
                "body": "인증, AI 상호작용, 저장소, 가격 정책, 관리자 통제를 하나의 애플리케이션 경계 안에서 운영합니다.",
            },
        ],
        "capability_label": "Executive Summary",
        "capability_title": "주요 기능",
        "capability_intro": (
            "이 플랫폼은 최종 사용자 기능과 함께, 의료 조직이 실제 도입 과정에서 요구하는 "
            "통제, 감독, 단계적 확장을 함께 고려한 구성을 제공합니다."
        ),
        "feature_cards": [
            {
                "title": "유연한 인증과 승인 절차",
                "body": (
                    "비밀번호, 이메일 OTP, Google OAuth로 로그인할 수 있으며, 신규 계정은 "
                    "승인 절차를 거친 뒤 임상 대화 기능을 사용할 수 있습니다."
                ),
            },
            {
                "title": "임상 AI 작업 공간",
                "body": (
                    "메인 작업 공간은 다회차 대화, 분석 깊이 선택, 그리고 검사, 영상, 병력, 약물 "
                    "시나리오에 맞춘 임상 분석 모드를 지원합니다."
                ),
            },
            {
                "title": "파일 및 임상 문맥 입력",
                "body": (
                    "일반 문서와 이미지 형식을 수용하고, 스크린샷을 지원하며, 더 풍부한 문맥 구성을 "
                    "위한 FHIR 기반 가져오기 및 포맷팅 흐름을 포함합니다."
                ),
            },
            {
                "title": "대화 이력 추적성",
                "body": (
                    "지속형 대화 기록, 다운로드 가능한 로그, 저장된 메시지 기록을 통해 이전 AI "
                    "상호작용을 다시 확인하고 감사 추적을 유지할 수 있습니다."
                ),
            },
            {
                "title": "모델 및 비용 거버넌스",
                "body": (
                    "AI 사용 전 크레딧을 확인하고, 모델 정책에 따라 차감한 뒤, 거래 원장에 기록합니다. "
                    "관리자는 모델 공개 여부와 가격 정책을 제어할 수 있습니다."
                ),
            },
            {
                "title": "조직 적용형 사용자 경험",
                "body": (
                    "고객별 UI 설정, 이중 언어 인터페이스, 역할 기반 관리자 기능을 통해 기관별 "
                    "운영 방식에 맞게 정렬하기 쉽습니다."
                ),
            },
        ],
        "architecture_title": "아키텍처 개요",
        "architecture_intro": (
            "애플리케이션은 브라우저 경험, API 라우트, 비즈니스 로직, 외부 연동을 하나의 코드베이스에 "
            "배치한 풀스택 Next.js 구조를 따르며, 배포와 운영 통제를 단순화합니다."
        ),
        "architecture_label": "Operating Model",
        "process_title": "간단한 운영 흐름도",
        "process_intro": (
            "다음 흐름은 통제된 임상 AI 요청이 플랫폼 안에서 어떻게 처리되는지 단순화해 보여줍니다."
        ),
        "process_items": [
            {
                "step": "1단계",
                "title": "인증 및 승인 확인",
                "body": "보호된 기능이 시작되기 전에 사용자 신원, 세션, 승인 상태를 확인합니다.",
            },
            {
                "step": "2단계",
                "title": "문맥 준비",
                "body": "프롬프트, 작업량 수준, 임상 모드, 모델 선택, 첨부 파일 여부를 수집합니다.",
            },
            {
                "step": "3단계",
                "title": "AI 정책 실행",
                "body": "입력을 검증하고 크레딧 규칙을 적용한 뒤 AI 클라이언트 계층으로 요청을 전달합니다.",
            },
            {
                "step": "4단계",
                "title": "결과 기록",
                "body": "메시지를 저장하고 크레딧을 갱신하며 후속 검토를 위한 대화 이력을 유지합니다.",
            },
        ],
        "architecture_layers": [
            {
                "title": "사용자 경험 계층",
                "items": [
                    "로그인 및 회원가입 페이지",
                    "채팅 작업 공간과 대화 이력",
                    "관리자 대시보드와 설정 기반 UI",
                    "번체 중국어와 영어 인터페이스 지원",
                ],
            },
            {
                "title": "애플리케이션 코어",
                "items": [
                    "Next.js App Router 페이지와 Route Handler",
                    "Zod 기반 입력 검증과 JWT 쿠키 세션 확인",
                    "작업량 매핑과 임상 기능별 처리 흐름",
                    "대화, 크레딧, 모델 제어 로직",
                ],
            },
            {
                "title": "데이터 및 외부 서비스",
                "items": [
                    "사용자, 세션, 메시지, 크레딧, 가격 정책을 위한 Supabase",
                    "AI 응답 생성을 위한 Anthropic Claude",
                    "OTP 이메일용 Resend와 연동 로그인용 Google OAuth",
                    "업로드 파일과 산출물을 위한 Cloudflare R2",
                ],
            },
        ],
        "flow_caption_left": "사용자 요청",
        "flow_caption_center": "통제된 AI 처리",
        "flow_caption_right": "기록되는 결과",
        "flow_steps": [
            "사용자를 인증하고 계정 상태를 확인합니다.",
            "작업량, 분석 모드, 모델, 첨부 파일 여부를 선택합니다.",
            "입력을 검증하고 크레딧 및 가격 정책을 해석합니다.",
            "구조화된 문맥을 AI 클라이언트 계층을 통해 Claude에 전달합니다.",
            "메시지를 저장하고 크레딧을 갱신하며 대화 이력을 유지합니다.",
        ],
        "stack_title": "기술 스택",
        "stack_items": [
            "React 18",
            "TypeScript 5",
            "Tailwind CSS",
            "Supabase",
            "PostgreSQL",
            "jose (JWT)",
            "bcryptjs",
            "Zod",
            "Resend",
            "Google OAuth",
            "Cloudflare R2",
            "Vitest",
        ],
        "governance_title": "보안, 거버넌스, 운영성",
        "governance_intro": (
            "채팅 인터페이스 외에도, 이 프로젝트는 통제된 접근, 예측 가능한 비용 관리, 운영 가시성을 "
            "중심에 두고 설계되었습니다."
        ),
        "governance_label": "Governance",
        "governance_cards": [
            {
                "title": "세션 및 접근 제어",
                "body": (
                    "JWT 세션은 HttpOnly 쿠키에 저장되며, 승인 상태와 관리자 역할 검사를 통해 "
                    "보호된 워크플로우 접근을 제어합니다."
                ),
            },
            {
                "title": "검증 및 오남용 방지",
                "body": (
                    "API 입력은 Zod로 검증하고, 비밀번호는 bcrypt로 해시하며, OTP 및 로그인 시도에 "
                    "대한 제한으로 오남용 위험을 줄입니다."
                ),
            },
            {
                "title": "운영 투명성",
                "body": (
                    "크레딧, 가격 정책, 고객 레코드, 모델 상태를 관리자 API에서 확인할 수 있어 "
                    "도입 현황과 사용 패턴을 파악할 수 있습니다."
                ),
            },
        ],
        "use_case_title": "적합한 활용 시나리오",
        "use_cases": [
            "검사 결과와 구조화된 관찰 데이터를 중심으로 한 임상 지원 대화",
            "영상 또는 문서 첨부를 포함한 방사선 관련 토의",
            "통제된 대화 이력을 기반으로 한 병력 요약",
            "모델 비용을 고려한 약물 검토 워크플로우",
        ],
        "closing_title": "도입 관점의 가치",
        "closing_body": (
            "Health Care Assistant는 인증, AI 상호작용, 저장소, 비용 추적을 하나의 통제된 플랫폼으로 "
            "운영하려는 팀에 적합합니다. 현재 구조는 단계적 도입, 고객별 UI 설정, 향후 의료 워크플로우 "
            "확장에 유리한 기반을 제공합니다."
        ),
        "disclaimer": (
            "본 시스템은 임상 지원 워크플로우를 위한 구조로 설계되었습니다. 단독 진단 시스템이 아니라, "
            "기관의 개인정보 보호, 보안, 전문가 검토 정책과 함께 운영되어야 합니다."
        ),
        "footer_tagline": "Health Care Assistant | Governance-aware Clinical AI Support Platform",
    },
}


def find_browser() -> Path | None:
    for candidate in BROWSER_CANDIDATES:
        if candidate.exists():
            return candidate
    return None


def write_html(language_key: str, content: dict[str, object]) -> Path:
    html_path = OUTPUT_DIR / f"{content['file_stem']}.html"
    html_path.write_text(build_html(content), encoding="utf-8")
    return html_path


def render_pdf(browser_path: Path, html_path: Path, pdf_path: Path) -> None:
    command = [
        str(browser_path),
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--print-to-pdf-no-header",
        f"--print-to-pdf={pdf_path}",
        html_path.resolve().as_uri(),
    ]
    subprocess.run(command, check=True, timeout=120)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    browser_path = find_browser()

    for language_key, content in CONTENT.items():
        html_path = write_html(language_key, content)
        print(f"[html] generated: {html_path}")

        if browser_path is not None:
            pdf_path = OUTPUT_DIR / f"{content['file_stem']}.pdf"
            render_pdf(browser_path, html_path, pdf_path)
            print(f"[pdf] generated:  {pdf_path}")
        else:
            print(f"[pdf] skipped: no compatible browser found for {language_key}")

    if browser_path is not None:
        print(f"[browser] used: {browser_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
