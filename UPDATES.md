# Daily Updates & Changelog

## [2025-12-04]

### 🚀 New Features
- **Teacher Class Assignment**: 
  - Added "Assign Classes" button in the Admin Dashboard (Faculty Tab).
  - Admins can now assign specific classes to teachers.
  - Teachers will only see their assigned classes upon login.
- **Teacher Login Update**:
  - Updated the Login flow to allow selecting a specific Teacher Profile from the faculty list.
- **Class Detail View**:
  - Teachers can now click on a class card to view the full list of students in that class.
  - Displays Student Name, Roll Number, Attendance, and Status.

### 🛠️ Improvements & Fixes
- **Data Synchronization**:
  - Implemented an auto-sync feature on the server to fix discrepancies between Student records and Class records.
  - Fixed an issue where the student count on class cards was incorrect.
- **UI/UX**:
  - Renamed "Save Assignments" to "Assign Classes" for clarity.
  - Fixed layout issues in the Assignment Modal where buttons were hidden.
- **Performance**:
  - Disabled API caching to ensure data is always fresh and accurate.
- **Database**:
  - Added automatic migration to ensure the `assignedClasses` column exists in the `teachers` table.

---
*This file tracks the daily progress and feature additions to the Gyan Learning Platform.*
