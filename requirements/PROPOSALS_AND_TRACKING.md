# Proposals and Tracking

## Purpose

The Proposals and Tracking screens provide tenant users with a way to create and review research proposals, inspect their workflow phases, and upload files associated with a proposal.

## Access and navigation

Both screens are available to authenticated tenant users after the tenant setup requirements are complete:

- **Proposals**: `/tenant/proposals`
- **Tracking**: `/tenant/proposals?view=tracking`
- **Proposal details**: `/tenant/proposals/{proposal}` redirects to the Proposals page with that proposal selected.

The sidebar displays **Proposals** and **Tracking** for tenant users. Tracking is a view of the proposals page selected by the `view=tracking` query parameter; it does not use a separate backend route. Administrators have a separate navigation menu.

## Proposals page

The Proposals page loads proposals with their assigned process, process phases and actions, required action documents, and current phase. Proposals are ordered newest first.

### Creating a proposal

1. Select **New Proposal** or **Create Proposal**. Each user can create up to three proposals total, including completed proposals.
2. Enter a title and submit the form.
3. The server validates the title as required text with a maximum length of 255 characters, creates the proposal for the signed-in user, and assigns the first available process when one exists.
4. On success, the user is taken to the Proposals page with the new proposal selected.

### Reviewing a proposal

The page selects the requested proposal when opened after creation or from a details link; otherwise, it initially selects the first active proposal, or the newest proposal if all are complete. Use **Switch proposal** to select another proposal. The switcher separates in-progress proposals under **Active** from completed proposals under **Archived**. It shows each proposal's title, ID, process, persisted status, creation date, phase pipeline, history, and action panel. The create button is disabled after the user's third proposal, and the server enforces the same limit.

The phase pipeline is built from the phases assigned to the proposal's process. Earlier phases can be selected to inspect their required documents and uploaded files; later phases are not selectable from this view. The action panel displays the current configured action and its required documents. **Submit** completes a submit action and follows the next configured action; it moves to another phase only when the action flow routes there. Review actions wait for an assigned reviewer to choose an approve/deny or custom outcome. Those outcomes follow their configured routes, and action and phase transitions are persisted in the tenant database.

Required files can be uploaded from the action panel. The upload type is inherited from the configured required document rather than selected by the proposer. When the required document specifies a MIME type, the uploaded file must match it. The server accepts files up to 10 MB, saves them using the active storage configuration, and attaches each document to the proposal together with its workflow phase, action, and required-document association. A submit action cannot be completed until its required files are uploaded. Uploaded-file status is derived from these saved records. Upload and storage validation errors are shown to the user.

## Tracking page

Tracking builds its phase pipeline from the persisted phases of assigned proposal processes. Proposals without an assigned workflow phase are not counted in a phase. The pipeline groups phases by their configured order and shows the number of saved proposals whose current phase has that order:

1. Select a phase from the pipeline. The phase label uses a single matching process phase name when available; otherwise, it displays a generic phase label.
2. The pipeline's count is based on persisted proposals whose current phase has that order.
3. The table lists proposals currently in the selected phase, with the proposal ID, title, process, and current phase.
4. If no proposals match the selected phase and search, the page displays an empty-state message.
5. Select **Details** on your proposal or one currently waiting for a review assigned to you. Tracking is shared within the institution; proposals stay out of other users' private Proposals lists, and only the owner or an assigned reviewer can open details.

Search filters saved proposals by title, process name, or current phase name. The table also includes a clearly marked sample preview that is not saved as a proposal. Its **Details** dialog demonstrates waiting and submitted states with example files. These controls and sample data are for preview only; they do not upload files, make an approval decision, or change a real proposal. The sample preview does not create a phase in the pipeline or affect persisted phase counts.

When there are no saved proposals, the phase pipeline has no data-derived phases, but the sample preview remains available in the table.

## Data and server behavior

Proposal records are stored through the tenant database connection and relate to their submitting user, institution, assigned process, current phase, and attached documents. Ownership is identified by institution, user ID, and account model type. The Proposals view is scoped to the signed-in owner; Tracking is shared only within that institution. Historical proposals with unknown institution ownership are intentionally excluded from both views rather than risk exposing them to another institution.

Existing tenant databases must run pending tenant migrations before deploying code that scopes proposals by institution and executes action workflows. Run the tenant migrations for the configured database using the database-setup screen's **Run Migrations** action. This applies `2026_10_21_001100_add_proposal_user_type`, `2026_10_21_001200_add_institution_id_to_proposals_table`, and `2026_10_21_001300_add_action_workflow_state_to_proposals`. Existing proposal rows have no reliably verifiable institution owner and remain excluded; newly created proposals receive an initial workflow action when one is configured.

| Operation | Server behavior |
|---|---|
| List proposals | Loads proposals, newest first, with workflow phases, current phase/action, action and phase history, and attached documents |
| Create proposal | Validates title and enforces a maximum of three proposals for the signed-in user and institution, including completed proposals; optionally assigns the first available process and its first configured action |
| Upload proposal document | Validates the file and any supplied phase/required-document association, derives the document label from its configured required document, and checks its MIME type when configured; stores the file, creates a document record, and attaches it to the proposal |
| Delete proposal document | Detaches the document; deletes its file and record only when it is no longer attached to proposals or actions |
| Submit proposal action | Completes the current submit action, validates its required files, follows its configured action/phase route, and records the action transition |
| Review proposal action | Allows an assigned reviewer to submit an approve/deny or custom outcome, follows its configured route, and records the decision |

Routes are protected by authentication, verification, tenant-user restrictions, and tenant setup middleware.
