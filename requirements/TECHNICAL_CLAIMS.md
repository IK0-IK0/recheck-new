# Claims Engineering: Technical Claims

## Purpose

This document provides a structured starting point for drafting independent and dependent patent claims. It supports the lab activity for drafting the initial "Invention Record" claims, the Claims Architecture presentation, and WPR 06: Technical Claims.

This is a technical drafting aid, not legal advice or a substitute for review by qualified patent counsel.

## 1. Invention Record

- Invention title: [Title]
- Inventors and contributors: [Names for counsel review]
- Technical field: [Field]
- Problem addressed: [Specific technical problem]
- Existing limitation: [Limitation of current approaches]
- Proposed solution: [Short technical description]
- Date first conceived or reduced to practice: [Date]
- Related disclosures or publications: [Details]

## 2. Claim Drafting Inputs

Capture the technical elements that may support claim language:

| Element | Technical structure or operation | Required relationship | Support location |
|---|---|---|---|
| [Element] | [What it is or does] | [How it connects or operates] | [Design, code, figure, or record] |

Document the system boundary, inputs, transformations, outputs, control decisions, data relationships, and software-hardware interactions. Avoid describing an intended result without identifying the mechanism that produces it.

## 3. Independent Claim Candidates

### 3.1 System Claim

Draft the broad system concept using concrete components and relationships:

> A system comprising: [first component]; [second component]; and [controller or processor] configured to [technical operation], wherein [relationship or technical constraint].

Candidate limitations to evaluate:

- [Specific component or module]
- [Data received or generated]
- [Processing or control operation]
- [Communication relationship]
- [Technical constraint or state condition]
- [Resulting technical effect]

### 3.2 Method Claim

Draft the operational sequence:

> A computer-implemented method comprising: receiving [input]; determining [condition]; performing [technical operation]; transmitting or applying [output]; and recording [state or result].

Confirm that each step is supported by an actual implementation and that the order of steps is meaningful where order is required.

### 3.3 Computer-Readable Medium Claim

Draft instructions tied to the technical method:

> A non-transitory computer-readable medium storing instructions that, when executed by one or more processors, cause the processors to [method operations].

Use this category only where the described software operations and technical implementation are adequately supported.

## 4. Dependent Claim Candidates

Dependent claims should add a specific technical limitation to an earlier claim.

| Parent claim | Added limitation | Technical reason | Support |
|---|---|---|---|
| [Claim] | [Limitation] | [What it improves or distinguishes] | [Reference] |

Possible dependent limitations include:

- A particular sensor, device, controller, or interface
- A message format, acknowledgment, or retry behavior
- A state transition or fault-recovery operation
- A timing, range, threshold, or resource constraint
- A data validation, correlation, or storage operation
- A security, authorization, or integrity mechanism
- A deployment configuration or hardware arrangement

Avoid adding limitations merely because they are implementation details unless they provide useful technical distinction or fallback coverage.

## 5. Claim Architecture

Map the intended claim set before final drafting:

| Claim | Type | Independent/Dependent | Core concept | Fallback or purpose |
|---|---|---|---|---|
| [1] | System/method/medium | Independent | [Core concept] | [Purpose] |
| [2] | [Type] | Dependent on [Claim] | [Added feature] | [Fallback] |

Check that the architecture covers the invention from more than one technical perspective where appropriate, while remaining consistent and supported by the specification.

## 6. Support and Consistency Review

- [ ] Every claimed element has written technical support.
- [ ] Component names and terminology are consistent.
- [ ] Inputs, outputs, units, and relationships are defined.
- [ ] Software operations are tied to a technical implementation.
- [ ] Alternative embodiments and equivalent implementations are recorded.
- [ ] Claim dependencies are valid and do not introduce contradictions.
- [ ] No result is claimed without describing how it is achieved.
- [ ] Drawings, invention records, and claim terms agree.
- [ ] Prior-art and legal scope questions are flagged for counsel.

## 7. Claims Architecture Presentation

The presentation should explain:

1. The technical problem and the proposed mechanism.
2. The core independent claim concept.
3. The system, method, and computer-readable-medium perspectives.
4. How dependent claims add technical fallback positions.
5. The relationship between claims, implementation evidence, and drawings.
6. Open questions requiring inventor or patent-counsel review.

## 8. WPR 06: Technical Claims

The WPR should contain:

- Invention Record summary
- Proposed independent claims
- Dependent claim tree or claim matrix
- Definitions of key technical terms
- Support and traceability references
- Alternative embodiments and fallback limitations
- Open legal or technical questions
- Review status and next actions

## 9. Review and Revision Record

| Revision | Date | Change | Reviewer | Status |
|---|---|---|---|---|
| [Revision] | [Date] | [Summary] | [Name] | [Draft/Reviewed/Approved] |
