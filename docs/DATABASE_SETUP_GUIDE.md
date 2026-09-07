# Database Setup UI Guide

## Quick Start

1. **Access the page**: Click "Database Setup" in the sidebar navigation
2. **Choose your database type**: Select either SQLite or Supabase
3. **Fill in the required fields**
4. **Save**: Click "Save Configuration" to test and save

---

## UI Components

### Header Section
- **Icon**: Database icon for visual clarity
- **Title**: "Database Setup"
- **Description**: Brief explanation of the feature

### Active Configuration Card (shown when configured)
- **Green success badge**: Shows currently active database
- **Configuration summary**: Display current driver, database, and host
- **Visual indicator**: CheckCircle icon for active status

### Configuration Form

#### Database Type Selector
Choose between:
- **SQLite (Local Development)** - For local testing
- **Supabase (PostgreSQL)** - For production use

#### SQLite Fields
When SQLite is selected:
- **Database Path**: Text input for the database file path
  - Example: `database/tenant.sqlite`
  - Helper text: Path relative to project root

#### Supabase (PostgreSQL) Fields
When Supabase is selected:
- **Host**: Supabase database host
  - Example: `db.xxxxxxxxxxxxx.supabase.co`
- **Port**: Database port (default: 5432)
- **Database Name**: Usually `postgres`
- **Username**: Database username (usually `postgres`)
- **Password**: Database password (encrypted on save)
- **Info Box**: Blue information card with tips on finding Supabase credentials

### Form Actions
- **Save Configuration**: Primary button - tests connection and saves
- **Reset to Current**: Secondary button - resets form to active config (shown only when there's an active config)

### Feedback Messages
- **Success Toast**: "Database configuration saved successfully"
- **Error Toast**: Shows specific error if connection fails
- **Connection Error Card**: Red alert box with detailed error message

---

## Usage Examples

### Setting up SQLite for Development

1. Navigate to Database Setup
2. Select "SQLite (Local Development)"
3. Enter path: `database/tenant.sqlite`
4. Click "Save Configuration"
5. See green success message

### Setting up Supabase for Production

1. Navigate to Database Setup
2. Select "Supabase (PostgreSQL)"
3. Enter your Supabase credentials:
   - Host: `db.abcdefghijklm.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: Your secure password
4. Click "Save Configuration"
5. Connection is tested automatically
6. See green success message if connection succeeds

### Switching Between Databases

You can switch from SQLite to Supabase (or vice versa) at any time:
1. Select the new database type
2. Fill in the required fields
3. Click "Save Configuration"
4. The previous configuration is deactivated
5. The new configuration becomes active

---

## Color Coding

- **Green**: Active/success state
- **Blue**: Information/helper text
- **Red**: Error state
- **Gray**: Neutral/secondary elements

---

## Responsive Design

The form is fully responsive:
- **Mobile**: Single column layout
- **Tablet**: Optimized spacing
- **Desktop**: Two-column grid for Port/Database fields

---

## Accessibility

- All form fields have proper labels
- Helper text for complex fields
- Color is not the only indicator (icons + text)
- Keyboard navigation support
- Screen reader compatible

---

## Integration Notes

The Database Setup page integrates with:
- **Navigation**: Link in main sidebar
- **Routes**: `/tenant/database-setup`
- **Backend**: `DatabaseSetupController`
- **Model**: `TenantDatabaseConfig`
- **Toast Notifications**: Sonner for user feedback
