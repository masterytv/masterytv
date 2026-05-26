# Decoded QA Checklist

**Tester:** _______________  
**Date:** _______________  
**Environment:** localhost:3001 / staging / production  
**Browser:** Chrome / Safari / Firefox / Mobile Safari  

> For each test, mark **✅ Pass**, **❌ Fail**, or **⏭️ Skip**.  
> Add comments in the **Notes** column — bugs, copy issues, design feedback, etc.

---

## 1. Assessment Flow (Sprint 0.1)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 1.1 | Assessment loads | Navigate to `/decoded/assess` | Assessment page renders with intro screen | | |
| 1.2 | Question progression | Answer first 5 questions | Progress bar updates, questions animate smoothly | | |
| 1.3 | Back navigation | Click back during assessment | Returns to previous question, previous answer preserved | | |
| 1.4 | Full completion | Complete all ~113 questions | Redirected to report page (not stuck on assess page) | | |
| 1.5 | Completion time | Time the full assessment | Target: ~25-35 minutes. Record actual: _____ min | | |
| 1.6 | Resume after refresh | Complete 20 questions → refresh browser → return | Assessment resumes from where you left off | | |
| 1.7 | Mobile responsiveness | Complete on phone or narrow viewport (375px) | All questions readable, buttons tappable, no overflow | | |

---

## 2. Report — Instant Score Dashboard (Sprint 0.2)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 2.1 | Immediate redirect | Complete assessment | Redirected to `/decoded/report/[id]` within 5 seconds | | |
| 2.2 | Score dashboard loads first | Observe report page on first load | Score Dashboard (Big Five radar, bars, archetype badge) visible IMMEDIATELY — no waiting for AI | | |
| 2.3 | Big Five Radar | Check radar chart | 5-axis radar renders with correct labels (O, C, E, A, N). Scores look reasonable (not all 50%) | | |
| 2.4 | Attachment Quadrant | Check attachment chart | Dot positioned in correct quadrant. Style label shown (Secure/Anxious/Avoidant/Disorganized) | | |
| 2.5 | Wellness Radar | Check 10-axis wellness radar | All 10 axes labeled and rendered. No overlapping text | | |
| 2.6 | Archetype badge | Check archetype display | Shows archetype name + sublabel + tagline. Feels personalized, not generic | | |
| 2.7 | Decoded Score | Check overall score | Shows a number (0-100). Displayed prominently | | |
| 2.8 | Screening indicators | Check screening section (if applicable) | Shows severity labels, NOT raw scores. Appropriate clinical disclaimers visible | | |

---

## 3. Report — AI Narrative Sections (Sprint 0.2)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 3.1 | Progressive loading | Watch report while AI generates | Skeleton loaders show for ungenerated sections. Sections appear one-by-one as they complete | | |
| 3.2 | Generation progress | Check progress indicator | Shows "Writing your story… X of Y sections complete" | | |
| 3.3 | Section content quality | Read each AI narrative section | Content is personalized, references YOUR actual scores/patterns. Not generic filler | | |
| 3.4 | Coach questions | Check end of each section | Each section has a "coach question" prompt at bottom (italic, in quotes) | | |
| 3.5 | Section count (Free) | Count visible unlocked sections | 7 sections visible and unlocked for free tier | | |
| 3.6 | Locked sections blur | Scroll past section 7 | Remaining sections show blurred preview with lock icon + upgrade prompt | | |
| 3.7 | Markdown rendering | Check formatting in sections | Headers, bold, lists, paragraphs render correctly. No raw markdown visible | | |
| 3.8 | Full generation time | Time from assessment complete → all sections done | Target: < 3 minutes. Record actual: _____ min | | |

---

## 4. Report — Data Visualizations per Section

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 4.1 | Big Five inline chart | Find the personality profile section | Inline bar chart or radar embedded in the section body | | |
| 4.2 | Attachment inline chart | Find the attachment section | Quadrant chart embedded, matches the dashboard | | |
| 4.3 | Wellness inline chart | Find the wellness section | Wellness radar or bar chart embedded | | |
| 4.4 | Chart responsiveness | View charts on mobile width | Charts scale without overflow or text collision | | |

---

## 5. Print / PDF Export (Sprint 0.2)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 5.1 | Print button visible | Scroll to bottom of report | "Save as PDF" button visible (fixed position, bottom-right) | | |
| 5.2 | Print dialog opens | Click "Save as PDF" | Browser print dialog opens | | |
| 5.3 | PDF quality | Save as PDF, open the file | White background, dark text, charts visible. No cut-off sections | | |
| 5.4 | Hidden elements | Check PDF output | No navigation, no upgrade buttons, no print button visible in PDF | | |
| 5.5 | Coach CTA hidden | Check PDF output | "Meet Your Coach" CTA should NOT appear in printed PDF | | |

---

## 6. Safety Layer (Sprint 0.2)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 6.1 | Disclaimer visible | Scroll to top of report | Assessment disclaimer text is visible | | |
| 6.2 | Crisis resources | (If test user has elevated ACE/distress indicators) | Crisis resources box appears with 988 lifeline, Crisis Text Line | | |
| 6.3 | Professional boundary | Read any clinical screening language | Report says "screening tool, not a diagnosis" or similar | | |

---

## 7. Upgrade Modal & Billing UI (Sprint 0.3)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 7.1 | Upgrade gate appears | Scroll past section 7 on free tier | "Keep Reading?" gate with upgrade CTA visible | | |
| 7.2 | Modal opens | Click "Unlock Full Report" | Upgrade modal opens with tier comparison cards | | |
| 7.3 | Tier cards display | Review all 4 tier cards | Free ($0), Insight ($29/yr), Growth ($69/yr), Mastery ($349/yr) | | |
| 7.4 | Feature lists | Read features for each tier | No technical codes (RS08, RD01). All copy is user-facing, outcome-driven | | |
| 7.5 | No banned icons | Inspect modal visually | NO sparkle icons anywhere. Typography carries the hierarchy | | |
| 7.6 | Free tier — invite feature | Check Free tier features | Lists "Invite friends to compare profiles" | | |
| 7.7 | Insight — 1 comparison | Check Insight tier features | Lists "1 compatibility report with a partner" | | |
| 7.8 | Growth — unlimited | Check Growth tier features | Lists "Unlimited relationship comparisons" as first feature | | |
| 7.9 | Modal close | Click X or backdrop | Modal closes cleanly, no scroll lock issues | | |
| 7.10 | Recommended badge | Check Insight card | Shows "Recommended" badge | | |

---

## 8. Coach Handoff — Report CTA (Sprint 0.4)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 8.1 | CTA visibility | Complete report generation, scroll to bottom | "Ready to put this into action?" CTA visible below PDF button | | |
| 8.2 | CTA design | Inspect CTA block | MessageSquare icon, gradient border, editorial midnight style | | |
| 8.3 | CTA copy | Read CTA text | "Your AI coach has already read your full assessment" — feels warm, not salesy | | |
| 8.4 | CTA link works | Click "Meet Your Coach" | Navigates to `/coachapp/onboarding` | | |
| 8.5 | CTA hidden while generating | Check CTA before all sections complete | CTA should NOT show while sections are still generating | | |

---

## 9. Coach Handoff — Onboarding Fast-Track (Sprint 0.4)

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 9.1 | Decoded detection | Navigate to `/coachapp/onboarding` as a Decoded user | Skips "About You", "Starting Point", "Research" steps entirely | | |
| 9.2 | No progress bar | Check header on fast-track | Progress bar is hidden (Decoded users only see 2 steps) | | |
| 9.3 | Coaching letter content | Read the coaching letter | Mentions YOUR archetype by name. References specific findings (e.g., attachment style, Big Five traits) | | |
| 9.4 | Letter personalization | Compare letter to your actual scores | At least 2 specific observations that match your real assessment data | | |
| 9.5 | Letter tone | Read the opening | Warm, conversational, NOT clinical. Feels like a coach who knows you | | |
| 9.6 | Coaching question | Read the closing | Ends with an open question like "What's most on your mind right now?" | | |
| 9.7 | Continue to channels | Click "Let's Go" | Advances to Channel Connect step (Web Chat, Email, Telegram) | | |
| 9.8 | Complete onboarding | Click "Start My First Session" | Redirects to `/coachapp/dashboard/chat` | | |
| 9.9 | Non-Decoded user | Log in as user WITHOUT a Decoded assessment → go to onboarding | Gets the full 5-step flow (About You → Starting Point → Research → etc.) | | |

---

## 10. Cross-Cutting Concerns

| # | Test | Steps | Expected Result | Status | Notes |
|---|------|-------|-----------------|--------|-------|
| 10.1 | Dark mode | Toggle dark mode throughout | All pages render correctly in dark mode. No white-on-white or invisible text | | |
| 10.2 | Light mode | Toggle light mode throughout | All pages render correctly in light mode | | |
| 10.3 | Mobile (assessment) | Complete assessment on phone | All questions, buttons, progress bars work. No horizontal scroll | | |
| 10.4 | Mobile (report) | View report on phone | Charts, sections, CTA all render. No overflow or unreadable text | | |
| 10.5 | Mobile (onboarding) | Complete onboarding on phone | All steps work, modals don't overflow viewport | | |
| 10.6 | Navigation | Use DecodedNav throughout | All nav links work. Active state highlights correctly | | |
| 10.7 | Auth required | Try `/decoded/report/[id]` while logged out | Redirected to login, then back to report after auth | | |
| 10.8 | Wrong user | Try viewing another user's report URL | Access denied or redirected — cannot view other users' reports | | |

---

## 11. Content Quality — Narrative Review

> For this section, read the actual AI-generated content and evaluate quality.

| # | Aspect | Rating (1-5) | Comments |
|---|--------|:---:|---------|
| 11.1 | Does the archetype feel accurate to you? | | |
| 11.2 | Does Section 1 (Who You Are) feel personal? | | |
| 11.3 | Are the Big Five descriptions accurate to your self-perception? | | |
| 11.4 | Is the attachment section insightful (not generic)? | | |
| 11.5 | Do the coach questions feel thought-provoking? | | |
| 11.6 | Is the writing quality professional? (No AI-isms, no "As an AI…") | | |
| 11.7 | Is the tone consistent across all sections? | | |
| 11.8 | Would you share this report with a friend? | | |
| 11.9 | Does the coaching letter feel like a real coach wrote it? | | |
| 11.10 | Overall: Does Decoded feel like a premium product? | | |

---

## Summary

| Category | Pass | Fail | Skip | Total |
|----------|:----:|:----:|:----:|:-----:|
| 1. Assessment Flow | | | | 7 |
| 2. Score Dashboard | | | | 8 |
| 3. AI Narrative | | | | 8 |
| 4. Data Visualizations | | | | 4 |
| 5. Print/PDF | | | | 5 |
| 6. Safety Layer | | | | 3 |
| 7. Billing UI | | | | 10 |
| 8. Report CTA | | | | 5 |
| 9. Coach Fast-Track | | | | 9 |
| 10. Cross-Cutting | | | | 8 |
| 11. Content Quality | | | | 10 |
| **TOTAL** | | | | **77** |

**Overall Assessment:** _______________  
**Blocking Issues:** _______________  
**Top 3 Priorities for Fix:** 
1. _______________
2. _______________
3. _______________
